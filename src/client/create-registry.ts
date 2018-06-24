import { ZKAPIClientOptions } from './interface/zk-api-client-options';
import { ZKClient } from './../core/registry/index';
import { APIClientBase } from 'cluster-client';


export class RegistryAPIClient extends APIClientBase {
    _client: ZKClient;
    options: ZKAPIClientOptions;

    get logger() {
      return this.options.logger;
    }

    constructor(options: ZKAPIClientOptions) {
      super(Object.assign({}, options, {
        initMethod: '_init'
      }));

      this.options = options;
    }

    get DataClient() {
      return ZKClient;
    }

    get delegates() {
      return {
      };
    }

    subscribe(config, listener) {
      this._client.subscribe(config, listener);
    }

    unSubscribe(config, listener) {
      this._client.unSubscribe(config, listener);
    }

    close() {
      return this._client.close();
    }

    async _init() {
      await this._client.ready();
    }
}

export default function createRegistry(options) {
  return new RegistryAPIClient(options);
}