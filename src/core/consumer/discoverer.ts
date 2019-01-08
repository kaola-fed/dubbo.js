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

  get env() {
    return this.options.env || '';
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

  static getProviderList(addressList) {
    return addressList.map(addr => {
      const address = decodeURIComponent(escape(addr));
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

  static checkMethods(providerMetaList, methods) {
    if (!methods || methods.length === 0) {
      return providerMetaList;
    }

    return providerMetaList.filter(({ meta }) => {
      const METHODS = (meta.methods || '').split(',');
      return methods.every(method => {
        return METHODS.includes(method);
      });
    });
  }

  static checkEnvOrGroup(providerMetaList, env, group, apps) {
    if (!env && !group) {
      return null;
    }

    let app = null;

    let penv = null;

    let pgroup = null;

    let isAppMatched = false;

    let envHasApp = false;

    let providerList = providerMetaList.filter(({ meta }) => {
      app = meta.application ? meta.application : meta['default.application'];
      penv = meta.env ? meta.env : meta['default.env'];

      if (!penv) {
        pgroup = meta.group ? meta.group : meta['default.group'];
        return pgroup === group;
      }

      isAppMatched = apps.includes(app);
      if (penv === env) {
        envHasApp = true;
      }

      return (penv === env) && isAppMatched;
    });

    if (providerList.length > 0) {
      return providerList;
    }

    if (envHasApp) {
      return null;
    }

    return [];
  }

  async _init() {
    this.on('update:providers', (addressList) => {
      let providers = Discoverer.getProviderList(addressList);
      providers = this.filterProvider(providers);
      providers = Discoverer.checkMethods(providers, this.methods);

      this.emit('update:providerList', providers);
    });

    if (!this.registry || !this.registry.subscribe) {
      throw new Error('invaled options.registry');
    }

    this.registry.subscribe({
      interfaceName: this.interfaceName
    }, (addressList) => {
      this.emit('update:providers', addressList);
    });

    await this.await('update:providers');
  }

  filterProvider(providerMetaList) {
    return providerMetaList.filter(({
      meta = {
        version: ''
      }, protocol
    }) => {
      const version = meta.version ? meta.version : meta['default.version'];
      // const env = meta.env ? meta.env : meta['default.env'];
      // const group = meta.group ? meta.group : meta['default.group'];

      const isVersionMatched = !this.version || version === this.version;
      // const isGroupMatched = !this.group || group === this.group;
      const isProtocolMatched = !this.protocol || protocol === (this.protocol + ':');

      return isVersionMatched && isProtocolMatched;
    });
  }
}