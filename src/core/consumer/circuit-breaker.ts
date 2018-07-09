enum states {
    Closed,
    Opend,
    HalfOpened,
}
const TIMEOUT = 10 * 1000;
const LIMIT = 10;

export class CircuitBreaker {
    timeout = TIMEOUT;
    limit = LIMIT;
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
        if (this.succCount >= this.limit) {
          this.state = states.Closed;
        }
      }
    }

    failed() {
      let self = this;
      this.failedCount++;
      this.succCount = 0;

      if (this.failedCount >= this.limit) {
        this.state = states.Opend;

        setTimeout(function() {
          self.state = states.HalfOpened;
        }, this.timeout);
      }
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
}