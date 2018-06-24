import { logger } from './../tools/logger';
import { RpcClientOptions } from './interface/rpc-client-options';
import SDKBase from 'sdk-base';
import assert from 'assert';
import createConsumer from './create-consumer';

export class RpcClient extends SDKBase {
    options: RpcClientOptions;

    get registry() {
      return this.options.registry;
    }

    get logger() {
      return this.options.logger;
    }

    constructor(options) {
      super(options);

      this.options = Object.assign({
        logger
      }, options);
      // assert(options.registry, '');
    }

    createConsumer(options) {
      return createConsumer(Object.assign({}, options, {
        registry: this.registry
      }));
    }

    createProvider() {

    }
}

export default function createRpc(options) {
  return new RpcClient(options);
}