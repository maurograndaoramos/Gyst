# Error Handling and Circuit Breaker API Documentation

## Overview

The Gyst document analysis system includes comprehensive error handling and fallback mechanisms to ensure graceful system degradation during AI processing failures. This documentation covers the circuit breaker implementation, timeout handling, manual intervention queue, and health monitoring capabilities.

## Architecture

### Components

1. **Circuit Breaker System**: Prevents cascading failures by failing fast when services are unhealthy
2. **Graceful Degradation Service**: Coordinates fallback mechanisms and partial result handling
3. **Manual Intervention Queue**: Captures failed tasks for human review and retry
4. **Health Monitoring**: Provides comprehensive system health visibility
5. **Error Handler**: Centralizes error processing with context logging

### Timeout Configuration

- **AI Processing Timeout**: 120 seconds (updated from 300 seconds)
- **Circuit Breaker Recovery**: 60 seconds
- **Success Threshold**: 3 consecutive successes to close circuit
- **Failure Threshold**: 5 failures to open circuit

## Circuit Breaker API Endpoints

### GET /api/circuit-breakers

Get the status of all circuit breakers in the system.

**Response:**
```json
{
  "circuit_breakers": {
    "document_analysis": {
      "name": "document_analysis",
      "state": "closed",
      "failure_count": 0,
      "success_count": 5,
      "last_failure_time": null,
      "last_success_time": "2025-01-01T12:00:00Z",
      "config": {
        "failure_threshold": 5,
        "recovery_timeout": 60,
        "success_threshold": 3,
        "timeout_seconds": 120,
        "rolling_window_seconds": 300
      }
    }
  },
  "total_breakers": 1,
  "healthy_breakers": 1,
  "open_breakers": 0,
  "half_open_breakers": 0
}
```

**Circuit States:**
- `closed`: Normal operation, requests are processed
- `open`: Circuit is open, failing fast to prevent cascading failures
- `half_open`: Testing if service has recovered

### POST /api/circuit-breakers/reset

Reset all circuit breakers to closed state.

**Response:**
```json
{
  "message": "All circuit breakers reset successfully",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

## Health Check Endpoints

### GET /health

Main application health check.

**Response:**
```json
{
  "status": "healthy",
  "service": "gyst-backend",
  "version": "1.0.0"
}
```

### GET /api/health

Document analysis service health check.

**Response:**
```json
{
  "status": "healthy",
  "service": "document_analysis",
  "message": "Document analysis service is running normally"
}
```

## Error Handling Flow

### 1. Processing Timeout

When AI processing exceeds 120 seconds:

1. Operation is cancelled with `asyncio.TimeoutError`
2. Circuit breaker records the failure
3. Partial results are returned if available
4. Task is queued for manual intervention

### 2. Circuit Breaker Activation

When failure threshold (5) is reached:

1. Circuit opens immediately
2. Subsequent requests fail fast with `CircuitBreakerError`
3. System enters degraded mode
4. Recovery timer starts (60 seconds)

### 3. Graceful Recovery

After recovery timeout:

1. Circuit transitions to `half_open` state
2. Limited requests are allowed through
3. After 3 consecutive successes, circuit closes
4. If failures continue, circuit reopens

## Manual Intervention Queue

Failed tasks are automatically queued for human review:

```python
# Task structure in intervention queue
{
    "task_id": "uuid-string",
    "error_type": "ProcessingTimeout",
    "context": {
        "operation": "document_analysis",
        "document_id": "doc_123",
        "document_path": "./uploads/document.pdf",
        "user_id": "user_456",
        "timestamp": "2025-01-01T12:00:00Z"
    },
    "retry_count": 1,
    "status": "pending"
}
```

## Configuration

### Circuit Breaker Settings

```python
@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5          # Failures before opening
    recovery_timeout: int = 60          # Seconds before trying half-open
    success_threshold: int = 3          # Successes to close from half-open
    timeout_seconds: int = 120          # Operation timeout
    rolling_window_seconds: int = 300   # Window for counting failures
```

### Environment Variables

```bash
# Timeout configuration
AI_PROCESSING_TIMEOUT=120

# Circuit breaker settings (optional, defaults shown)
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=3
CIRCUIT_BREAKER_ROLLING_WINDOW=300
```

## Monitoring and Observability

### Health Status Calculation

The system provides comprehensive health status:

```json
{
  "overall_status": "degraded",
  "circuit_breakers": {
    "total": 3,
    "healthy": 2,
    "open": 1,
    "half_open": 0
  },
  "active_circuits": 3,
  "manual_queue_size": 5,
  "last_update": "2025-01-01T12:00:00Z"
}
```

### Error Logging

All errors are logged with rich context:

```json
{
  "level": "ERROR",
  "timestamp": "2025-01-01T12:00:00Z",
  "error_id": "uuid-string",
  "error_type": "ProcessingTimeout",
  "message": "Document analysis timed out after 120 seconds",
  "context": {
    "operation": "document_analysis",
    "document_path": "./uploads/doc.pdf",
    "processing_time": 120.5,
    "circuit_breaker_state": "open"
  },
  "stack_trace": "..."
}
```

## Usage Examples

### Checking System Health

```python
import httpx

async def check_system_health():
    async with httpx.AsyncClient() as client:
        # Check main health
        health = await client.get("http://localhost:8000/health")
        print(f"Main service: {health.json()['status']}")
        
        # Check circuit breakers
        circuits = await client.get("http://localhost:8000/api/circuit-breakers")
        circuit_data = circuits.json()
        
        print(f"Total breakers: {circuit_data['total_breakers']}")
        print(f"Open breakers: {circuit_data['open_breakers']}")
```

### Resetting Circuit Breakers

```python
async def reset_circuits():
    async with httpx.AsyncClient() as client:
        response = await client.post("http://localhost:8000/api/circuit-breakers/reset")
        if response.status_code == 200:
            print("Circuit breakers reset successfully")
        else:
            print(f"Reset failed: {response.text}")
```

### Handling Circuit Breaker Errors

```python
from backend.src.backend.core.error_handling.circuit_breaker import CircuitBreakerError

try:
    result = await document_service.analyze_document(document_path)
except CircuitBreakerError:
    # Circuit is open, service is unhealthy
    return {
        "status": "service_unavailable",
        "message": "Document analysis service is temporarily unavailable",
        "retry_after": 60
    }
except asyncio.TimeoutError:
    # Processing timed out
    return {
        "status": "timeout",
        "message": "Document analysis timed out",
        "partial_results": get_partial_results()
    }
```

## Testing

### Integration Tests

```bash
# Run error handling integration tests
pytest backend/tests/test_error_handling_integration.py -v

# Run performance tests
pytest backend/tests/test_error_handling_performance.py -v

# Run specific circuit breaker tests
pytest backend/tests/test_error_handling_integration.py::TestCircuitBreakerIntegration -v
```

### Load Testing

```python
# Test circuit breaker under load
async def load_test_circuit_breaker():
    tasks = []
    for i in range(100):
        task = test_document_analysis(f"doc_{i}.txt")
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    failures = len([r for r in results if isinstance(r, Exception)])
    print(f"Failure rate: {failures/100:.2%}")
```

## Best Practices

### 1. Monitoring

- Monitor circuit breaker states in production
- Set up alerts for open circuits
- Track error rates and recovery times

### 2. Configuration

- Adjust thresholds based on your traffic patterns
- Use shorter timeouts for user-facing operations
- Configure longer recovery times for external dependencies

### 3. Error Handling

- Always handle `CircuitBreakerError` in client code
- Provide meaningful error messages to users
- Implement retry logic with exponential backoff

### 4. Manual Intervention

- Regularly review the manual intervention queue
- Implement automated retry for transient failures
- Escalate persistent failures to development team

## Troubleshooting

### Circuit Breaker Stuck Open

1. Check service health with `/api/health`
2. Review error logs for root cause
3. Fix underlying issue
4. Reset circuit breaker with `/api/circuit-breakers/reset`

### High Error Rates

1. Check Gemini API quota and rate limits
2. Verify network connectivity
3. Review document processing pipeline
4. Check for resource constraints (memory, CPU)

### Manual Queue Backlog

1. Identify common failure patterns
2. Improve error handling for those cases
3. Consider increasing timeout values
4. Review document complexity and size limits

## Future Enhancements

### Planned Features

1. **Circuit Breaker Metrics**: Detailed metrics collection and dashboards
2. **Dynamic Thresholds**: Auto-adjust based on traffic patterns
3. **Partial Circuit Breaking**: Per-operation circuit breakers
4. **Advanced Recovery**: Gradual traffic increase after recovery
5. **Integration Testing**: Automated testing of failure scenarios

### Configuration Extensions

1. **Per-Service Settings**: Different thresholds per service
2. **Time-Based Rules**: Different settings by time of day
3. **User-Based Priorities**: VIP user bypass options
4. **Geographic Routing**: Regional circuit breaker policies

This documentation provides comprehensive coverage of the error handling and circuit breaker implementation, ensuring robust system behavior during failures and clear operational procedures for monitoring and maintenance.
