enum states {
    Closed,
    Opened,
    HalfOpened,
}
const TIMEOUT = 10 * 1000;
const FAIL_LIMIT = 10;


const SUCC_LIMIT = 3;

class CircuitBreaker {
    succCount = 0;
    failedCount = 0;
    state = states.Closed;
    options;

    constructor(options?) {
      this.options = options || {};
    }

    get change() {
      return this.options.change;
    }

    get meta() {
      return this.options.meta || {};
    }

    get timeout() {
      return this.options.openTimeout || TIMEOUT;
    }

    get failLimit() {
      return this.options.failLimit || FAIL_LIMIT;
    }

    get succLimit() {
      return this.options.succLimit || SUCC_LIMIT;
    }

    isOpened() {
      return this.state === states.Opened;
    }

    isClosed() {
      return this.state === states.Closed;
    }

    isHalfOpened() {
      return this.state === states.HalfOpened;
    }

    succ() {
      this.succCount++;
      this.failedCount = 0;

      if (this.isHalfOpened()) {
        if (this.succCount >= this.succLimit) {
          const from = this.state;
          this.state = states.Closed;
          this.change(from, this.state, this);
        }
      }
    }

    failed() {
      let self = this;
      this.failedCount++;
      this.succCount = 0;

      if (this.failedCount >= this.failLimit) {
        const from = this.state;

        this.state = states.Opened;

        setTimeout(function() {
          self.state = states.HalfOpened;
          this.change(from, this.state, this);
        }, this.timeout);
        this.change(from, this.state, this);
      }
    }
}

export {
  CircuitBreaker,
  states as CircuitBreakerStates
};