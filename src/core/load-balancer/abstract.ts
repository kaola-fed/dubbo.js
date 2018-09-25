abstract class ILoadBalancer {
    protected COUNT: number;
    constructor(count = 0) {
      this.reset(count);
    }
    reset(count: number) {
      this.COUNT = count;
    }
    abstract pick();
}

export {
  ILoadBalancer
};