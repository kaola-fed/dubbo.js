# dubbo.js
[![npm version][npm-image]][npm-url] [![npm download][download-image]][download-url] 

[npm-image]: https://img.shields.io/npm/v/dubbo.js.svg?style=flat
[npm-url]: https://www.npmjs.com/package/dubbo.js

[download-image]: https://img.shields.io/npm/dm/dubbo.js.svg?style=flat
[download-url]: https://www.npmjs.com/package/dubbo.js

# 简介

nodeJs下dubbo 客户端工具


# 特性支持
    
*  连接复用，同时支持hessian、jsonrpc 协议

*  支持配置长连接池大小，调用dubbo服务的链接可控。

*  可配的服务熔断机制，调用失败降级，更加可靠

*  TODO：可拓展的传输编码协议


# 安装使用

```
$ npm install dubbo.js -S
```

## 主要方法

### createRegistry

新建registry仓库
```js
createRegistry({
    logger,         // logger对象，默认为 console
    zookeeper,      // zk源处理，默认使用 ‘zookeeper-cluster-client’ 包
    root,           // zk连接root，默认为 ‘dubbo’
    zkHosts         // zk连接地址
});

// 对象主要提供3个方法：
subscribe(config: Object {interfaceName}, listener: function)     // 订阅服务，watch可用的服务地址
unSubscribe(config, listener)   // 取消订阅
close()                         // 关闭该registry，断开zk连接
```
示例：
```js
import { createRegistry } from 'dubbo.js';
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
使用单个registry获得一个消费者实例。
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
详细消费者配置见下面文档。

### createRpcClient
interfaceName的服务对应产生的rpc客户端实例，可直接产生其消费者实例

        interfaceName 对应服务端提供的服务
        
# 使用示例
以下是一次使用jsonrpc协议调用dubbo服务的操作
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
        interfaceName: 'com.user.client.consumer'
    });
    
    const config = {
        dubboVersion: '3.0.6-SNAPSHOT',
        version: '1.0',
        group: 'performance',
        protocol: 'jsonrpc',                  //jsonrpc or dubbo，需要看服务端支持情况
        timeout: 3000,
        loadBalance: 'roundRobin',            //连接池中负载均衡方式，默认 ‘random’，可选 ‘random’，‘roundRobin’
        pool: {
            min: 2,                             //连接池最小连接数， 默认 2
            max: 4,                             //连接池最大连接数， 默认 4
            maxWaitingClients: 10,           
            evictionRunIntervalMillis: 10000,   //轮询清理空闲太久未使用的连接的时间间隔，默认 10000ms
            idleTimeoutMillis: 180000,          //这段时间内连接未被使用会被当作空闲连接，然后被上述evict流程清理，默认 180000ms
            keepAlive: true
        },
        circuitBreaker: {                   // 熔断器配置
            openTimeout: 10000,               // 默认 10s，熔断时间窗口，熔断的连接等待10s后会尝试半开等待探活
            failLimit: 10,                    // 默认 10次，连接连续异常处理请求10次后被熔断
            succLimit: 5                      // 默认 3次， 连续成功处理请求3次后连接被打开
        }
    };
    
    const consumer = rpcClient.createConsumer(config);

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

createConsumer配置解释（标*为必填字段）：
#### interfaceName
代表 dubbo 暴露的接口服务，根据 interface 字段会找到对应接口的 provider，与 Java 开发约定即可。

#### * config.protocol
目前支持的 rpc 调用方式有：

jsonrpc

dubbo

获取，默认为 dubbo(hessian协议)

#### config.dubboVersion
dubbo暴露的接口对呀的dubbo版本，用来筛选接口，默认为 '2.8.0'版本

#### config.jsonRpcVersion
jsonrpc协议暴露的接口对呀的版本，用来调用接口， 默认为 '2.0'版本

#### config.version
version 字段用来对找到的 provider 进行删选，不填或填写 '*' 则不做删选。

#### config.group
group 字段用来对找到的 provider 进一步删选，不填或填写 '*' 则不做删选。

#### config.methods
=支持启动时检查 Provider 是否提供出合法的方法，配置 methods 属性即可

#### config.loadBalance
连接池中选取连接的负载均衡方式，默认 ‘random’，可选 ‘random’，‘roundRobin’

## 调用方法 （invoke）
调用对应的远程服务方法

#### invoke(method, params, headers?, opts?) 

    method: String          调用的远程方法名
    params: Object          与服务端约定好的传参格式的对象
    headers: Array(String)  请求头，如Dubbo-Attachments信息
    opts: Object        其他参数，现支持：{
                                    rpcMsgId: 1,
                                    timeout: 3000, //请求超时时间，超过该时间当作错误走重试
                                    retry: 1,      //失败重试次数
                                    mock: xxxx     //重试失败后兜底返回的数据,可为任何类型
                                }
    '注： opts.rpcMsgId 是jsonrpc协议下的调用标识符。为整型数字，服务端返回调用结果时会带
    回该字段用来标示为该次调用的返回。默认为 1'

# 熔断机制
客户端中连接池中的一个连接遇到若干次连续的请求异常，原因可能很多：例如 服务端断开连接、服务暂时不可用、请求超时等。

由于连接还是在连接池中的说明它还是处于合法的provider列表中的，这种情况这个连接我们可能需要等待服务端的服务恢复才能去使用。

极端情况，所有连接都不可用了，从客户端角度考虑是不应该继续无止境的请求的，因此引入熔断机制。dubbo.js中的熔断器逻辑如下：

![rongduan][rd-image]

[rd-image]: https://haitao.nos.netease.com/b6f1ec20-eeeb-417a-9b7e-b46cb1809cb7_1268_750.jpg

# 额外参数详解

#### 连接池配置：
    
    // dubbo调用连接池配置，可以按照项目需要修改配置
    config.pool = {
        min: 2,                             //连接池最小连接数， 默认 2
        max: 4,                             //连接池最大连接数， 默认 4
        maxWaitingClients: 10,           
        evictionRunIntervalMillis: 10000,   //轮询清理空闲太久未使用的连接的时间间隔，默认 10000ms
        idleTimeoutMillis: 180000,          //这段时间内连接未被使用会被当作空闲连接，然后被上述evict流程清理，默认 180000ms
        keepAlive: true
    };

#### 熔断器配置：
        config.circuitBreaker = {                   //可选配置，熔断器配置
            openTimeout: 10000,               // 默认 10s，熔断时间窗口，熔断的连接等待10s后会尝试半开等待探活
            failLimit: 10,                    // 默认 10次，连接连续异常处理请求10次后被熔断
            succLimit: 5                      // 默认 3次， 连续成功处理请求3次后连接被打开
        }

# Todo
*  支持协议可拓展

<br/>

## LICENSE
MIT