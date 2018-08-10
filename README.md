# dubbo.js

## API

### createRegistry
```js
import { createRpcClient, createConsumer, createRegistry } from 'dubbo.js';
async function launch() {
    const registry = createRegistry({
        logger: console,
        zkHosts: '127.0.0.1:2181'
    });

    await registry.ready();

    registry.subscribe({
        interfaceName: 'com.xxx.yyy'
    }, addressList => {
        console.log(addressList)
    })
}
launch()
    .catch(console.error);
```


### createConsumer
```js
import { createConsumer, createRegistry } from 'dubbo.js';
async function launch() {
    const registry = createRegistry({
        logger: console,
        zkHosts: '127.0.0.1:2181'
    });

    await registry.ready();

    const consumer = createConsumer({
        registry,
        interfaceName: 'com.xxx.yyy'
    });

    await consumer.ready();
}

launch()
    .catch(console.error);
```

### createRpcClient
```js
import { createRpcClient, createRegistry } from 'dubbo.js';
async function launch() {
    const registry = createRegistry({
        logger: console,
        zkHosts: '127.0.0.1:2181'
    });

    await registry.ready();

    const rpcClient = createRpcClient({
        registry,
    });

    const consumer = rpcClient.createConsumer({
        interfaceName: 'com.xxx.yyy'
    })

    await consumer.ready();
    // 发起调用
    consumer.invoke('getUser', [{
        $class: 'java.lang.Long',
        $: 4
    }], ['Dubbo-Attachments: key1=1,key2=2'], {
        retry: 3,
        mock: {
            id: 1,
            name: 'sysuser'
        },
        timeout: 3000
    });
}

launch()
    .catch(console.error);
```


## LICENSE
MIT