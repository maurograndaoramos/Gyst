"""Cache strategies for embedding and content caching."""
import time
import logging
from typing import Dict, Any, Optional, List, Tuple
from abc import ABC, abstractmethod
from dataclasses import dataclass
from collections import OrderedDict
import threading

logger = logging.getLogger(__name__)

@dataclass
class CacheEntry:
    """Represents a cache entry with metadata."""
    key: str
    value: Any
    created_at: float
    last_accessed: float
    access_count: int = 0
    size_bytes: int = 0
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

class CacheStrategy(ABC):
    """Abstract base class for cache strategies."""
    
    def __init__(self, max_size: int = 1000):
        """Initialize cache strategy.
        
        Args:
            max_size: Maximum number of items in cache
        """
        self.max_size = max_size
        self.cache: Dict[str, CacheEntry] = {}
        self._lock = threading.RLock()
        self._stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "total_requests": 0
        }
    
    @abstractmethod
    def should_evict(self, entry: CacheEntry) -> bool:
        """Determine if an entry should be evicted."""
        pass
    
    @abstractmethod
    def select_eviction_candidate(self) -> Optional[str]:
        """Select a cache entry for eviction."""
        pass
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        with self._lock:
            self._stats["total_requests"] += 1
            
            if key in self.cache:
                entry = self.cache[key]
                entry.last_accessed = time.time()
                entry.access_count += 1
                self._stats["hits"] += 1
                logger.debug(f"Cache hit for key: {key}")
                return entry.value
            else:
                self._stats["misses"] += 1
                logger.debug(f"Cache miss for key: {key}")
                return None
    
    def put(self, key: str, value: Any, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Put value in cache."""
        with self._lock:
            current_time = time.time()
            
            # Estimate size (rough approximation)
            size_bytes = self._estimate_size(value)
            
            # Create cache entry
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=current_time,
                last_accessed=current_time,
                access_count=1,
                size_bytes=size_bytes,
                metadata=metadata or {}
            )
            
            # Check if key already exists
            if key in self.cache:
                # Update existing entry
                self.cache[key] = entry
                logger.debug(f"Updated cache entry for key: {key}")
                return True
            
            # Check if we need to evict
            while len(self.cache) >= self.max_size:
                evict_key = self.select_eviction_candidate()
                if evict_key:
                    self._evict(evict_key)
                else:
                    logger.warning("Could not find eviction candidate, cache may be full")
                    return False
            
            # Add new entry
            self.cache[key] = entry
            logger.debug(f"Added new cache entry for key: {key}")
            return True
    
    def remove(self, key: str) -> bool:
        """Remove entry from cache."""
        with self._lock:
            if key in self.cache:
                del self.cache[key]
                logger.debug(f"Removed cache entry for key: {key}")
                return True
            return False
    
    def clear(self):
        """Clear all cache entries."""
        with self._lock:
            self.cache.clear()
            logger.info("Cache cleared")
    
    def _evict(self, key: str):
        """Evict a cache entry."""
        if key in self.cache:
            del self.cache[key]
            self._stats["evictions"] += 1
            logger.debug(f"Evicted cache entry for key: {key}")
    
    def _estimate_size(self, value: Any) -> int:
        """Estimate size of value in bytes."""
        try:
            if isinstance(value, str):
                return len(value.encode('utf-8'))
            elif isinstance(value, (list, tuple)):
                return sum(self._estimate_size(item) for item in value)
            elif isinstance(value, dict):
                return sum(self._estimate_size(k) + self._estimate_size(v) for k, v in value.items())
            else:
                # Rough estimate for other types
                return len(str(value).encode('utf-8'))
        except Exception:
            return 1024  # Default estimate
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            hit_rate = self._stats["hits"] / max(1, self._stats["total_requests"])
            total_size = sum(entry.size_bytes for entry in self.cache.values())
            
            return {
                "cache_size": len(self.cache),
                "max_size": self.max_size,
                "hit_rate": hit_rate,
                "hits": self._stats["hits"],
                "misses": self._stats["misses"],
                "evictions": self._stats["evictions"],
                "total_requests": self._stats["total_requests"],
                "total_size_bytes": total_size,
                "average_entry_size": total_size / max(1, len(self.cache))
            }
    
    def get_cache_info(self) -> List[Dict[str, Any]]:
        """Get information about cache entries."""
        with self._lock:
            return [
                {
                    "key": entry.key,
                    "created_at": entry.created_at,
                    "last_accessed": entry.last_accessed,
                    "access_count": entry.access_count,
                    "size_bytes": entry.size_bytes,
                    "age_seconds": time.time() - entry.created_at
                }
                for entry in self.cache.values()
            ]

class LRUCacheStrategy(CacheStrategy):
    """Least Recently Used cache strategy."""
    
    def __init__(self, max_size: int = 1000):
        """Initialize LRU cache strategy."""
        super().__init__(max_size)
        self.access_order = OrderedDict()  # Track access order
    
    def get(self, key: str) -> Optional[Any]:
        """Get value and update access order."""
        value = super().get(key)
        if value is not None:
            # Move to end (most recently used)
            self.access_order.move_to_end(key)
        return value
    
    def put(self, key: str, value: Any, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Put value and update access order."""
        success = super().put(key, value, metadata)
        if success:
            # Update access order
            self.access_order[key] = True
            self.access_order.move_to_end(key)
        return success
    
    def remove(self, key: str) -> bool:
        """Remove entry and update access order."""
        success = super().remove(key)
        if success and key in self.access_order:
            del self.access_order[key]
        return success
    
    def clear(self):
        """Clear cache and access order."""
        super().clear()
        self.access_order.clear()
    
    def should_evict(self, entry: CacheEntry) -> bool:
        """LRU always evicts when cache is full."""
        return len(self.cache) >= self.max_size
    
    def select_eviction_candidate(self) -> Optional[str]:
        """Select least recently used entry for eviction."""
        if self.access_order:
            # Get the first (least recently used) key
            lru_key = next(iter(self.access_order))
            del self.access_order[lru_key]
            return lru_key
        return None

class TTLCacheStrategy(CacheStrategy):
    """Time To Live cache strategy."""
    
    def __init__(self, max_size: int = 1000, default_ttl_seconds: int = 3600):
        """Initialize TTL cache strategy.
        
        Args:
            max_size: Maximum number of items in cache
            default_ttl_seconds: Default time to live in seconds
        """
        super().__init__(max_size)
        self.default_ttl = default_ttl_seconds
    
    def get(self, key: str) -> Optional[Any]:
        """Get value if not expired."""
        with self._lock:
            if key in self.cache:
                entry = self.cache[key]
                if self._is_expired(entry):
                    # Remove expired entry
                    del self.cache[key]
                    logger.debug(f"Removed expired cache entry: {key}")
                    self._stats["misses"] += 1
                    self._stats["total_requests"] += 1
                    return None
                else:
                    # Entry is valid
                    entry.last_accessed = time.time()
                    entry.access_count += 1
                    self._stats["hits"] += 1
                    self._stats["total_requests"] += 1
                    return entry.value
            else:
                self._stats["misses"] += 1
                self._stats["total_requests"] += 1
                return None
    
    def put(self, key: str, value: Any, metadata: Optional[Dict[str, Any]] = None, ttl_seconds: Optional[int] = None) -> bool:
        """Put value with TTL."""
        # Add TTL to metadata
        if metadata is None:
            metadata = {}
        metadata["ttl_seconds"] = ttl_seconds or self.default_ttl
        metadata["expires_at"] = time.time() + metadata["ttl_seconds"]
        
        return super().put(key, value, metadata)
    
    def should_evict(self, entry: CacheEntry) -> bool:
        """Check if entry is expired or cache is full."""
        return self._is_expired(entry) or len(self.cache) >= self.max_size
    
    def select_eviction_candidate(self) -> Optional[str]:
        """Select expired or oldest entry for eviction."""
        current_time = time.time()
        
        # First, try to find expired entries
        for key, entry in self.cache.items():
            if self._is_expired(entry):
                return key
        
        # If no expired entries, select oldest
        if self.cache:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k].created_at)
            return oldest_key
        
        return None
    
    def _is_expired(self, entry: CacheEntry) -> bool:
        """Check if cache entry is expired."""
        if "expires_at" in entry.metadata:
            return time.time() > entry.metadata["expires_at"]
        return False
    
    def cleanup_expired(self) -> int:
        """Remove all expired entries and return count."""
        with self._lock:
            expired_keys = [
                key for key, entry in self.cache.items()
                if self._is_expired(entry)
            ]
            
            for key in expired_keys:
                del self.cache[key]
            
            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
            
            return len(expired_keys)

class HybridCacheStrategy(CacheStrategy):
    """Hybrid cache strategy combining LRU and TTL."""
    
    def __init__(self, max_size: int = 1000, default_ttl_seconds: int = 3600):
        """Initialize hybrid cache strategy."""
        super().__init__(max_size)
        self.default_ttl = default_ttl_seconds
        self.access_order = OrderedDict()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value considering both TTL and LRU."""
        with self._lock:
            if key in self.cache:
                entry = self.cache[key]
                
                # Check TTL first
                if self._is_expired(entry):
                    del self.cache[key]
                    if key in self.access_order:
                        del self.access_order[key]
                    self._stats["misses"] += 1
                    self._stats["total_requests"] += 1
                    return None
                
                # Update LRU order
                entry.last_accessed = time.time()
                entry.access_count += 1
                self.access_order.move_to_end(key)
                self._stats["hits"] += 1
                self._stats["total_requests"] += 1
                return entry.value
            else:
                self._stats["misses"] += 1
                self._stats["total_requests"] += 1
                return None
    
    def put(self, key: str, value: Any, metadata: Optional[Dict[str, Any]] = None, ttl_seconds: Optional[int] = None) -> bool:
        """Put value with both TTL and LRU tracking."""
        # Add TTL to metadata
        if metadata is None:
            metadata = {}
        metadata["ttl_seconds"] = ttl_seconds or self.default_ttl
        metadata["expires_at"] = time.time() + metadata["ttl_seconds"]
        
        success = super().put(key, value, metadata)
        if success:
            self.access_order[key] = True
            self.access_order.move_to_end(key)
        return success
    
    def remove(self, key: str) -> bool:
        """Remove entry from both cache and access order."""
        success = super().remove(key)
        if success and key in self.access_order:
            del self.access_order[key]
        return success
    
    def clear(self):
        """Clear both cache and access order."""
        super().clear()
        self.access_order.clear()
    
    def should_evict(self, entry: CacheEntry) -> bool:
        """Check if entry should be evicted based on TTL or cache size."""
        return self._is_expired(entry) or len(self.cache) >= self.max_size
    
    def select_eviction_candidate(self) -> Optional[str]:
        """Select eviction candidate prioritizing expired, then LRU."""
        # First check for expired entries
        for key, entry in self.cache.items():
            if self._is_expired(entry):
                if key in self.access_order:
                    del self.access_order[key]
                return key
        
        # Then use LRU
        if self.access_order:
            lru_key = next(iter(self.access_order))
            del self.access_order[lru_key]
            return lru_key
        
        return None
    
    def _is_expired(self, entry: CacheEntry) -> bool:
        """Check if cache entry is expired."""
        if "expires_at" in entry.metadata:
            return time.time() > entry.metadata["expires_at"]
        return False
    
    def cleanup_expired(self) -> int:
        """Remove all expired entries."""
        with self._lock:
            expired_keys = [
                key for key, entry in self.cache.items()
                if self._is_expired(entry)
            ]
            
            for key in expired_keys:
                del self.cache[key]
                if key in self.access_order:
                    del self.access_order[key]
            
            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
            
            return len(expired_keys)

# Factory function for creating cache strategies
def create_cache_strategy(strategy_type: str = "hybrid", **kwargs) -> CacheStrategy:
    """Create a cache strategy instance.
    
    Args:
        strategy_type: Type of strategy ('lru', 'ttl', 'hybrid')
        **kwargs: Additional arguments for strategy initialization
        
    Returns:
        Cache strategy instance
    """
    if strategy_type.lower() == "lru":
        return LRUCacheStrategy(**kwargs)
    elif strategy_type.lower() == "ttl":
        return TTLCacheStrategy(**kwargs)
    elif strategy_type.lower() == "hybrid":
        return HybridCacheStrategy(**kwargs)
    else:
        raise ValueError(f"Unknown cache strategy type: {strategy_type}")
