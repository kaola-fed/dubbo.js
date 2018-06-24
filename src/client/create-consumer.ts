import { ConsumerDataClient } from './../core/consumer/index';
import { APIClientBase } from 'cluster-client';
import assert from 'assert';
import pify from 'pify';

import querystring from 'querystring';

export class Consumer extends APIClientBase {
    options: any;
    _client: ConsumerDataClient;

    constructor(options) {
      super(Object.assign({}, options, {
        initMethod: '_init',
      }));

      this.options = options;

      assert(options.interfaceName, '请配置 Consumer 的 interfaceName');
      assert(options.registry || options.serverHosts, '请指定 Consumer 直连 Provider 的 serverHost');
    }

    get DataClient() {
      return ConsumerDataClient;
    }

    get delegates() {
      return {
        invoke: 'invoke'
      };
    }

    invoke(method, args) {
      return pify(this._client.invoke)(method, args);
    }

    async _init() {
      await this._client.ready();
    }
}

export default function createConsumer(options) {
  return new Consumer(options);
}