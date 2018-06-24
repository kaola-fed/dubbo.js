enum states {
    Closed,
    Opend,
    HalfOpened,
}

export class CircuitBreaker {
    timeout = 10 * 1000;
    limit = 10;
    succCount = 0;
    failedCount = 0;
    state = states.Closed;
    options;

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

    constructor(options?) {
      this.options = options || {};
    }

    succ() {
      this.succCount++;
      this.failedCount = 0;

      if (this.isHalfOpened) {
        if (this.succCount >= this.limit) {
          this.state = states.Closed;
        }
      }
    }

    failed() {
      this.failedCount++;
      this.succCount = 0;

      if (this.failedCount >= this.limit) {
        this.state = states.Opend;

        setTimeout(function() {
          this.state = states.HalfOpened;
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