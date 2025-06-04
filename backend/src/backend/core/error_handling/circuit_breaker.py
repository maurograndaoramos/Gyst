"""Circuit breaker implementation for AI processing failures."""
import asyncio
import logging
from typing import Dict, Any, Optional, Callable, Awaitable
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass
import time

logger = logging.getLogger(__name__)

class CircuitState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Circuit is open, failing fast
    HALF_OPEN = "half_open"  # Testing if service is recovered

@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5          # Number of failures before opening
    recovery_timeout: int = 60          # Seconds before trying half-open
    success_threshold: int = 3          # Successes needed to close from half-open
    timeout_seconds: int = 120          # Operation timeout
    rolling_window_seconds: int = 300   # Window for counting failures

class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open."""
    pass

class CircuitBreaker:
    """Circuit breaker for protecting against cascading failures."""
    
    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        """Initialize circuit breaker."""
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.last_success_time: Optional[datetime] = None
        self.failure_times: list = []
        self._lock = asyncio.Lock()
    
    async def call(self, func: Callable[..., Awaitable[Any]], *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection."""
        async with self._lock:
            # Check if we should transition to half-open
            if (self.state == CircuitState.OPEN and 
                self.last_failure_time and
                datetime.utcnow() - self.last_failure_time >= timedelta(seconds=self.config.recovery_timeout)):
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
                logger.info(f"Circuit breaker {self.name} transitioning to HALF_OPEN")
        
        # Fail fast if circuit is open
        if self.state == CircuitState.OPEN:
            logger.warning(f"Circuit breaker {self.name} is OPEN, failing fast")
            raise CircuitBreakerError(f"Circuit breaker {self.name} is open")
        
        try:
            # Execute with timeout
            result = await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=self.config.timeout_seconds
            )
            
            # Record success
            await self._on_success()
            return result
            
        except Exception as e:
            # Record failure
            await self._on_failure(e)
            raise
    
    async def _on_success(self):
        """Handle successful operation."""
        async with self._lock:
            self.last_success_time = datetime.utcnow()
            
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.config.success_threshold:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    self.failure_times.clear()
                    logger.info(f"Circuit breaker {self.name} transitioning to CLOSED")
            elif self.state == CircuitState.CLOSED:
                # Reset failure count on success in closed state
                self.failure_count = max(0, self.failure_count - 1)
    
    async def _on_failure(self, error: Exception):
        """Handle failed operation."""
        async with self._lock:
            current_time = datetime.utcnow()
            self.last_failure_time = current_time
            self.failure_times.append(current_time)
            
            # Clean old failure times outside rolling window
            cutoff_time = current_time - timedelta(seconds=self.config.rolling_window_seconds)
            self.failure_times = [t for t in self.failure_times if t > cutoff_time]
            
            self.failure_count = len(self.failure_times)
            
            # Check if we should open the circuit
            if (self.state in [CircuitState.CLOSED, CircuitState.HALF_OPEN] and
                self.failure_count >= self.config.failure_threshold):
                self.state = CircuitState.OPEN
                logger.error(
                    f"Circuit breaker {self.name} transitioning to OPEN after {self.failure_count} failures"
                )
    
    def get_state(self) -> Dict[str, Any]:
        """Get current circuit breaker state."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "last_success_time": self.last_success_time.isoformat() if self.last_success_time else None,
            "config": {
                "failure_threshold": self.config.failure_threshold,
                "recovery_timeout": self.config.recovery_timeout,
                "success_threshold": self.config.success_threshold,
                "timeout_seconds": self.config.timeout_seconds,
                "rolling_window_seconds": self.config.rolling_window_seconds
            }
        }
    
    async def reset(self):
        """Reset circuit breaker to closed state."""
        async with self._lock:
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.success_count = 0
            self.failure_times.clear()
            self.last_failure_time = None
            self.last_success_time = None
            logger.info(f"Circuit breaker {self.name} manually reset to CLOSED")

class CircuitBreakerManager:
    """Manager for multiple circuit breakers."""
    
    def __init__(self):
        """Initialize circuit breaker manager."""
        self.breakers: Dict[str, CircuitBreaker] = {}
        self.default_config = CircuitBreakerConfig()
    
    def get_breaker(self, name: str, config: Optional[CircuitBreakerConfig] = None) -> CircuitBreaker:
        """Get or create a circuit breaker."""
        if name not in self.breakers:
            self.breakers[name] = CircuitBreaker(name, config or self.default_config)
        return self.breakers[name]
    
    def get_all_states(self) -> Dict[str, Dict[str, Any]]:
        """Get states of all circuit breakers."""
        return {name: breaker.get_state() for name, breaker in self.breakers.items()}
    
    async def reset_all(self):
        """Reset all circuit breakers."""
        for breaker in self.breakers.values():
            await breaker.reset()
        logger.info("All circuit breakers reset")

# Global circuit breaker manager
_circuit_breaker_manager: Optional[CircuitBreakerManager] = None

def get_circuit_breaker_manager() -> CircuitBreakerManager:
    """Get or create the global circuit breaker manager."""
    global _circuit_breaker_manager
    if _circuit_breaker_manager is None:
        _circuit_breaker_manager = CircuitBreakerManager()
    return _circuit_breaker_manager

def reset_circuit_breaker_manager() -> None:
    """Reset the global circuit breaker manager (useful for testing)."""
    global _circuit_breaker_manager
    _circuit_breaker_manager = None
