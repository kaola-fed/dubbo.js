import SDKBase from 'sdk-base';
import URL from 'url';
import querystring from 'querystring';


export class Discoverer extends SDKBase {
  options;

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

  constructor(options) {
    super(Object.assign({}, options, {
      initMethod: '_init',
    }));
    this.options = options;
  }

  async _init() {
    this.on('update:providers', (addressList) => {
      let providers = this.getProviderList(addressList);
      providers = this.filterProvider(providers);
      providers = this.checkMethods(providers);
      this.emit('update:serverAddress', providers);
    });

    this.registry.subscribe({
      interfaceName: this.interfaceName
    }, (addressList) => {
      this.emit('update:providers', addressList);
    });

    await this.await('update:providers');
  }

  getProviderList(addressList) {
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
}