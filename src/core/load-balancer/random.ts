import { ILoadBalancer } from './abstract';

class Random extends ILoadBalancer {
  constructor(max) {
    super(max);
  }

  pick() {
    return Math.trunc(Math.random() * this.COUNT);
  }
}

export {
  Random
};