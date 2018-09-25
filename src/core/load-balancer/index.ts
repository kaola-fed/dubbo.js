import { ILoadBalancer } from './abstract';
import { Random } from './random';
import { RoundRobin } from './round-robin';

const loadBalancers = {
  random: Random,
  roundRobin: RoundRobin
};


const get = (type = 'roundRobin') => {
  assert(loadBalancers[type], `不合法的 LB 类型 ${type}`);
  return loadBalancers[type];
};

export {
  ILoadBalancer,
  get as getLoadBalancer
};