import { ILoadBalancer } from './abstract';

class RoundRobin extends ILoadBalancer {
    private crt = -1;

    pick() {
      if (this.crt >= this.COUNT - 1) {
        this.crt = 0;
      } else {
        this.crt++;
      }

      return this.crt;
    }
}

export {
  RoundRobin
};