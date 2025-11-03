/**
 * Sliding Window Rate Limiter
 */
export class SlidingWindowRateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 1000;
    this.requests = [];
  }

  canRequest() {
    this.cleanup();
    return this.requests.length < this.maxRequests;
  }

  tryRequest() {
    this.cleanup();

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(Date.now());
    return true;
  }

  async waitForSlot() {
    while (!this.canRequest()) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.tryRequest();
  }

  cleanup() {
    const now = Date.now();
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
  }
}
