import { ZKAPIClientOptions } from './interface/zk-api-client-options';
import { ZKClient } from './../core/registry/index';
import { APIClientBase } from 'cluster-client';
// import * as pify from 'pify';


export class RegistryAPIClient extends APIClientBase {
    _client: ZKClient;
    options: ZKAPIClientOptions;

    get logger() {
      return this.options.logger;
    }

    constructor(options: any) {
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
        'subscribe': 'subscribe'
      };
    }

    async _init() {
      await this._client.ready();
    }
}

