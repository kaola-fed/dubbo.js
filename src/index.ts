export * from './core';

import createRegistry from './client/create-registry';
import createRpcClient from './client/create-rpc';
import createConsumer from './client/create-consumer';

export {
  createRegistry,
  createRpcClient,
  createConsumer
};
