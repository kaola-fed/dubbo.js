import { ProviderNode } from '../../interface/provider-node';
import { CircuitBreaker } from '../circuit-breaker';
import { CircuitBreakerStates } from '../circuit-breaker/circuit-breaker';
import { ILoadBalancer, getLoadBalancer } from '../load-balancer';


export class AddressManager {
    LoadBalancer;
    serverCount: number;
    addresses: Array<{data: ProviderNode; state: CircuitBreakerStates}>;
    circuitBreakers = new Map<CircuitBreakerStates, CircuitBreaker[]>();
    loadBalancers = new Map<CircuitBreakerStates, ILoadBalancer>();

    constructor(avaliable: Array<ProviderNode>, BalancerType?) {
      this.LoadBalancer = getLoadBalancer(BalancerType);
      this.reset(avaliable);
    }

    reset(avaliable: Array<ProviderNode>) {
      const LoadBalancer = this.LoadBalancer;
      this.serverCount = avaliable.length;
      this.addresses = avaliable.map((item: ProviderNode) => ({
        state: CircuitBreakerStates.Closed,
        data: item,
      }));

      this.createCircuitBreaker(CircuitBreakerStates.Closed, avaliable.map((item, index) => index));
      this.createCircuitBreaker(CircuitBreakerStates.HalfOpened);
      this.createCircuitBreaker(CircuitBreakerStates.Opened);

      this.createLoadbalancer(CircuitBreakerStates.Closed, LoadBalancer);
      this.createLoadbalancer(CircuitBreakerStates.HalfOpened, LoadBalancer);
      this.createLoadbalancer(CircuitBreakerStates.Opened, LoadBalancer);
    }

    createCircuitBreaker(type: CircuitBreakerStates, list: Array<number> = []) {
      this.circuitBreakers.set(type, list.map(item => new CircuitBreaker({
        meta: item,
        change: this.onChange.bind(this)
      })));
    }

    createLoadbalancer(type, LoadBalancer) {
      this.loadBalancers.set(type, new LoadBalancer(
        this.circuitBreakers.get(type).length
      ));
    }

    onChange(from, to, circuitBreaker) {
      const circuitBreakers = this.circuitBreakers;
      const index = circuitBreakers.get(from).indexOf(circuitBreaker);

      circuitBreakers.get(to).push(
        circuitBreakers.get(from).splice(index, 1)[0]
      );

      this.loadBalancers.get(from).reset(circuitBreakers.get(from).length);
      this.loadBalancers.get(to).reset(circuitBreakers.get(to).length);
    }

    hasProviders() {
      return this.serverCount > 0;
    }

    hasAvaliable() {
      return this.circuitBreakers[CircuitBreakerStates.Opened].length !== this.serverCount;
    }

    has(type) {
      return this.circuitBreakers[type].length != 0;
    }

    pick(status): {id, state, data: ProviderNode} {
      const index: number = this.loadBalancers.get(status).pick();
      const id: number = this.circuitBreakers.get(status)[index].meta;
      const meta: {state: CircuitBreakerStates, data: ProviderNode} = this.addresses[id];

      return {
        id,
        state: meta.state,
        data: meta.data
      };
    }

    find(id): CircuitBreaker {
      const address = this.addresses[id];

      if (address) {
        const { state }: {state: CircuitBreakerStates} = address;

        const circuitBreakers: CircuitBreaker[] = this.circuitBreakers.get(state);
        const ids: number[] = circuitBreakers.map((item: CircuitBreaker) => item.meta);

        const index: number = ids.indexOf(id);

        if (index >= 0) {
          return circuitBreakers[index];
        }
      }
    }

    succ(id) {
      const circuitBreaker: CircuitBreaker = this.find(id);

      if (circuitBreaker) {
        circuitBreaker.succ();
      }
    }

    failed(id) {
      const circuitBreaker: CircuitBreaker = this.find(id);

      if (circuitBreaker) {
        circuitBreaker.failed();
      }
    }
}