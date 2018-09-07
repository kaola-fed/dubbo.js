enum states {
    Closed,
    Opend,
    HalfOpened,
}
const TIMEOUT = 10 * 1000;
const FAIL_LIMIT = 10;


const SUCC_LIMIT = 3;

export class CircuitBreaker {
    succCount = 0;
    failedCount = 0;
    state = states.Closed;
    options;

    constructor(options?) {
      this.options = options || {};
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

    static group(list: Array<CircuitBreaker>) {
      return list.reduce((meta, item) => {
        if (item.isHalfOpened()) {
          meta.halfOpened.push(item);
        } else if (item.isClosed()) {
          meta.closed.push(item);
        } else {
          meta.opened.push(item);
        }
        return meta;
      }, {
        halfOpened: [],
        closed: [],
        opened: []
      });
    }

    isOpened() {
      return this.state === states.Opend;
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
          this.state = states.Closed;
        }
      }
    }

    failed() {
      let self = this;
      this.failedCount++;
      this.succCount = 0;

      if (this.failedCount >= this.failLimit) {
        this.state = states.Opend;

        setTimeout(function() {
          self.state = states.HalfOpened;
        }, this.timeout);
      }
    }
}