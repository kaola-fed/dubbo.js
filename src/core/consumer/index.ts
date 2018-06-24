import SDKBase from 'sdk-base';
import assert from 'assert';
import URL from 'url';
import querystring from 'querystring';

class NoneProviderError extends Error {
  constructor(consumer) {
    super();
    this.name = 'NoneProviderError';
    this.message = `Consumer - {interfaceName: ${consumer.interfaceName}, group: ${consumer.group || ''}, version: ${consumer.version || ''}} 不存在可用服务提供方`;
  }
}

export class ConsumerDataClient extends SDKBase {
    options: any;

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

    get DataClient() {
      return ConsumerDataClient;
    }

    get delegates() {
      return {
      };
    }

    serverAddressList = [];

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
        callback(new NoneProviderError(this));
      }
      callback(null, {});
    }

    // 磨平 registry 与 direct 模式的差异，最终生效的都为 serverAddressList
    async _init() {
      if (this.registry) {
        await this.discoveryService();
      } else {
        this.direct();
      }

      if (this.check && this.serverAddressList.length === 0) {
        throw new NoneProviderError(this);
      }
    }

    async discoveryService() {
      this.on('providers-update', (addressList) => {
        let providers = this.getProviderMetaList(addressList);

        providers = this.filterProvider(providers);
        providers = this.checkMethods(providers);

        this.serverAddressList = providers.map(({ protocol, hostname, port }) => {
          return {
            protocol, hostname, port
          };
        });
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
      this.serverAddressList = serverHosts
        .map(item => URL.parse(item))
        .map(({ protocol, hostname, port }) => ({ protocol, hostname, port }));
    }
}