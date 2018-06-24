const { createRegistry, createRpcClient } = require('dubbo.js');

async function launch() {
  const registry = createRegistry({
    logger: console,
    zkHosts: '10.170.164.121:2181'
  });

  await registry.ready();

  const rpcClient = createRpcClient({
    registry,
  });

  const consumer = rpcClient.createConsumer({
    interfaceName: 'com.xxx.yyy',
    check: true
  });

  try {
    await consumer.ready();
  } catch (e) {
    await registry.close();
    await consumer.close();
    throw e;
  }

  console.log('>>> 连接成功');
}

launch()
  .catch(console.error);