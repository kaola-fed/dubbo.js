import { ConsumerOptions } from './../../interface/consumer-options';
import { CircuitBreaker } from './circuit-breaker';
import SDKBase from 'sdk-base';
import assert from 'assert';
import URL from 'url';
import querystring from 'querystring';
import { groupCircuitBreaker } from '../../tools/group-circuit-breaker';
import { random } from './load-balancer';

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

    get check() {
      return this.options.check;
    }

    get registry() {
      return this.options.registry;
    }

    get interfaceName() {
      return this.options.interfaceName;
    }

    get methods() {
      return this.options.methods;
    }

    get group() {
      return this.options.group || '';
    }

    get version() {
      return this.options.version || '';
    }

    get protocol() {
      return this.options.protocol;
    }

    serverAddressList: Array<CircuitBreaker>;
    balancerLoad;

    constructor(options) {
      super(Object.assign({}, options, {
        initMethod: '_init',
      }));

      this.options = options;
      assert(options.registry || options.serverHosts, 'new ConsumerDataClient(options) 需要指定 options.serverHosts');
    }

    getProviderMetaList(addressList) {
      return addressList.map(address => {
        address = decodeURIComponent(address);
        const { protocol, hostname, port, query } = URL.parse(address);
        const meta = querystring.parse(query);

        return {
          protocol,
          hostname,
          port,
          meta
        };
      });
    }

    checkMethods(providerMetaList) {
      if (!this.methods || this.methods.length === 0) {
        return providerMetaList;
      }

      return providerMetaList.filter(({ meta }) => {
        const methods = (meta.methods || '').split(',');
        return this.methods.every(method => {
          return methods.includes(method);
        });
      });
    }

    filterProvider(providerMetaList) {
      return providerMetaList.filter(({ meta, protocol }) => {
        const version = meta.version ? meta.version : meta['default.version'];
        const group = meta.group ? meta.group : meta['default.group'];

        const isVersionMatched = !this.version || version === this.version;
        const isGroupMatched = !this.group || group === this.group;
        const isProtocolMatched = !this.protocol || protocol === (this.protocol + ':');

        return isVersionMatched && isGroupMatched && isProtocolMatched;
      });
    }

    invoke(method, args, callback) {
      if (this.serverAddressList.length === 0) {
        return callback(new NoneProviderError(this));
      }

      const { halfOpened, opened, closed } = groupCircuitBreaker(this.serverAddressList);

      if (halfOpened.length > 0 && this.isExploreTraffic()) {
        // 探活流量
        let item = random(halfOpened);

      } else if (closed.length > 0) {
        // 正常访问
        let item = random(closed);

      } else {
        if (closed.length === this.serverAddressList.length) {
          return callback(new AllCircuitBreakersOpenedError(this));
        }
      }

      callback(null, {});
    }

    isExploreTraffic() {
      return Math.random() < 0.05;
    }

    // 磨平 registry 与 direct 模式的差异，最终生效的都为 serverAddressList
    async _init() {
      if (this.registry) {
        await this.discovery();
      } else {
        this.direct();
      }

      if (this.check && this.serverAddressList.length === 0) {
        throw new NoneProviderError(this);
      }
    }

    initServerAddress(serverAddress) {
      this.serverAddressList = this.initCircuitBreakers(serverAddress);
    }

    initLoadBanlancers(list) {
      return random(list);
    }

    initCircuitBreakers(serverAddress) {
      return serverAddress
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

    async discovery() {
      this.on('providers-update', (addressList) => {
        let providers = this.getProviderMetaList(addressList);
        providers = this.filterProvider(providers);
        providers = this.checkMethods(providers);
        this.initServerAddress(providers);
      });

      this.registry.subscribe({
        interfaceName: this.interfaceName
      }, (addressList) => {
        this.emit('providers-update', addressList);
      });

      await this.await('providers-update');
    }

    direct() {
      const { serverHosts } = this.options;
      this.initServerAddress(serverHosts.map(item => URL.parse(item)));
    }
}