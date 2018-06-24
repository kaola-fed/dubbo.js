import { ConsumerOptions } from './../interface/consumer-options';
import { Consumer } from './../core/consumer/index';
import { APIClientBase } from 'cluster-client';
import { logger } from './../tools/logger';
import { RpcClientOptions } from './interface/rpc-client-options';
import SDKBase from 'sdk-base';
import pify from 'pify';
import assert from 'assert';

export class RpcClient extends SDKBase {
  options: any;

  constructor(options) {
    super(Object.assign({}, options, {
      initMethod: '_init',
    }));

    this.options = options;

    assert(options.interfaceName, '请配置 Consumer 的 interfaceName');
    assert(options.registry || options.serverHosts, '请指定 Consumer 直连 Provider 的 serverHost');
  }

  get logger() {
    return this.options.logger || logger;
  }


  createConsumer(options: ConsumerOptions) {
    return new Consumer(options);
  }

}

export default function createRpcClient(options) {
  return new RpcClient(options);
}