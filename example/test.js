const conf = require('./config');
const { createRegistry, createRpcClient } = require('../dist');

const sleep = async (time) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), time);
  });
};

async function launch() {
  const registry = createRegistry({
    logger: console,
    zkHosts: 'kaola-test-dubbozk01.v1.kaola.jdb.vpc:2181,kaola-test-dubbozk02.v1.kaola.jdb.vpc:2181,kaola-test-dubbozk03.v1.kaola.jdb.vpc:2181'
  });

  await registry.ready();

  const rpcClient = createRpcClient({
    registry,
    interfaceName: 'com.netease.kaola.pop.crm.web.service.GoodsService'
  });

  const consumer = rpcClient.createConsumer({
    dubboVersion: '3.0.6-SNAPSHOT',
    version: '',
    group: "pop_test1jd",
    protocol: "jsonrpc",
    timeout: 3000,
    loadBalance: 'roundRobin',                //连接池中负载均衡方式，默认 ‘random’，可选 ‘random’，‘roundRobin’
    pool: {
      min: 2,                             //连接池最小连接数， 默认 2
      max: 4,                             //连接池最大连接数， 默认 4
      maxWaitingClients: 10,           
      evictionRunIntervalMillis: 10000,   //轮询清理空闲太久未使用的连接的时间间隔，默认 10000ms
      idleTimeoutMillis: 180000,          //这段时间内连接未被使用会被当作空闲连接，然后被上述evict流程清理，默认 180000ms
      keepAlive: true
    },
    circuitBreaker: {
      openTimeout: 10000,               // 默认 10s，熔断时间窗口，熔断的连接等待10s后会尝试半开等待探活
      failLimit: 10,                    // 默认 10次，连接连续异常处理请求10次后被熔断
      succLimit: 5                      // 默认 3次， 连续成功处理请求3次后连接被打开
    }
  });

  // const dubboRpcClient = createRpcClient({
  //   registry,
  //   interfaceName: conf.dubboPath
  // });

  // const dubboConsumer = dubboRpcClient.createConsumer({
  //   dubboVersion: '3.0.6-SNAPSHOT',
  //   version: '',
  //   group: 'performance',
  //   protocol: 'dubbo',
  //   timeout: 3000,
  //   pool: {
  //     min: 2,
  //     max: 4,
  //     maxWaitingClients: 10,
  //     keepAlive: true
  //   }
  // });

  try {
    // await dubboConsumer.ready();

    // const reg = await dubboConsumer.invoke('registerUser', [{
    //   $class: conf.dubboClass,
    //   $: {
    //     id: {
    //       $class: 'java.lang.Long',
    //       $: 1111
    //     },
    //     name: {
    //       $class: 'java.lang.String',
    //       $: 'testdubbo'
    //     }
    //   }
    // }], [], {
    //   retry: 3
    // });
    // const res = await dubboConsumer.invoke('getUser', [{
    //   $class: 'java.lang.Long',
    //   $: 2
    // }], [], {
    //   retry: 3
    // });
    // console.log('register', res);

    await consumer.ready();
    const res = await consumer.invoke('queryCategoryTreeVOs', [{

    }], [''], {
      retry: 3,
      rpcMsgId: 2
    });
    await sleep(500);
    
    let res1 = await consumer.invoke('queryGoodsList', [{

    }], [''], {
      retry: 3,
      rpcMsgId: 2
    });
    await sleep(500);
  
    console.log('findAttachments', res, res1);
  } catch (e) {
    await registry.close();
    //await consumer.close();
    throw e;
  }

}

launch()
  .catch(console.error);