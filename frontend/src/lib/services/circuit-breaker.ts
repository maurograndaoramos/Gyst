export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(config: CircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold;
    this.resetTimeout = config.resetTimeout;
  }

  isAvailable(): boolean {
    if (this.failures >= this.failureThreshold) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeout) {
        this.reset();
        return true;
      }
      return false;
    }
    return true;
  }

  onSuccess(): void {
    this.reset();
  }

  onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  private reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
  }
} 