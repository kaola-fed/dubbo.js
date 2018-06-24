import { InvokeOptions } from './../../interface/invoke-options';
import { Discoverer } from './discoverer';
import { ConsumerOptions } from './../../interface/consumer-options';
import { CircuitBreaker } from './circuit-breaker';
import SDKBase from 'sdk-base';
import assert from 'assert';
import URL from 'url';
import { randomLoadBalance, roundRoubinLoadBalance } from './load-balancer';

const serverAddress = Symbol('serverAddress');
enum states {
  normal,
  discovery
}

class NoneProviderError extends Error {
  constructor(consumer) {
    super();
    this.name = 'NoneProviderError';
    this.message = `Consumer - {interfaceName: ${consumer.interfaceName}, group: ${consumer.group || ''}, version: ${consumer.version || ''}} 不存在可用服务提供方`;
  }
}

class AllCircuitBreakersOpenedError extends Error {
  constructor(consumer) {
    super();
    this.name = 'NoneProviderError';
    this.message = `Consumer - {interfaceName: ${consumer.interfaceName}, group: ${consumer.group || ''}, version: ${consumer.version || ''}} 所有的服务提供方都被熔断了`;
  }
}

export class Consumer extends SDKBase {
    options: ConsumerOptions;
    discoverer: Discoverer;

    get check() {
      return this.options.check;
    }

    get registry() {
      return this.options.registry;
    }

    get serverAddress() {
      return this[serverAddress];
    }

    set serverAddress(serverAddress) {
      this[serverAddress] = serverAddress
        .map(
          ({ protocol, hostname, port }) => new CircuitBreaker({
            meta: {
              protocol,
              hostname,
              port
            }
          })
        );
    }

    serverAddressList: Array<CircuitBreaker>;
    balancerLoad: Function;

    constructor(options) {
      super(Object.assign({}, options, {
        initMethod: '_init',
      }));

      this.options = options;
      this.balancerLoad = randomLoadBalance();
      assert(options.registry || options.serverHosts, 'rpcClient.createConsumer(options) 需要指定 options.serverHosts');
    }

    async invoke(method, args, options: InvokeOptions = {}) {
      if (this.serverAddress.length === 0) {
        throw new NoneProviderError(this);
      }

      const { halfOpened, closed } = CircuitBreaker.group(this.serverAddress);

      if (closed.length === this.serverAddress.length) {
        throw new AllCircuitBreakersOpenedError(this);
      }

      // @TODO
      // 1. 生成上下文信息
      // 1. protocol.encode
      // 2. 判断是否需要探活，生成对应的 serverAddress

      let item; let state;
      if (halfOpened.length > 0 && this.isExploreTraffic() && options.retry === 1) {
        // 探活流量
        item = this.balancerLoad(halfOpened, 'halfOpened');
        state = states.discovery;
      } else if (closed.length > 0) {
        // 正常访问
        item = this.balancerLoad(closed, 'closed');
        state = states.normal;
      }

      // 3. Socket Pool 代理 socket 复用
      // 4.1 返回成功
      // 4.1.1 protocol.decode
      // 4.1.2 解析上下文信息
      // 4.1.3 CircuitBreaker.succ
      // 4.2 失败
      // 4.2.1 未超出 Retry阈值，Retry
      // 4.2.2 如果超出 Retry 阈值，降级（Mock）
      // 4.2.3 CircuitBreaker.failed

      return;
    }

    isExploreTraffic() {
      return Math.random() < 0.05;
    }

    // 抹平 注册中心模式 与 直连 模式的差异，最终生效的都为 this.serverAddress
    async _init() {
      if (this.registry) {
        await this.discovery();
      } else {
        this.direct();
      }

      if (this.check) {
        if (this.serverAddress.length === 0) {
          throw new NoneProviderError(this);
        }
      }
    }

    async discovery() {
      const discoverer = new Discoverer(this.options);
      discoverer.on('update:serverAddress', (serverAddress) => {
        this.serverAddress = serverAddress;
      });
      await discoverer.ready();
    }

    direct() {
      this.serverAddress = this.options.serverHosts.map(item => URL.parse(item));
    }
}