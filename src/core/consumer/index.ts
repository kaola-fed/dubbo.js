import { InvokeOptions } from './../../interface/invoke-options';
import { Discoverer } from './discoverer';
import { ConsumerOptions } from './../../interface/consumer-options';
import { CircuitBreaker } from './circuit-breaker';
import { Client, ClientWithPool } from './client';
import Encoder from '../../tools/encoder';
import SDKBase from 'sdk-base';
import assert from 'assert';
import URL from 'url';
import { randomLoadBalance /*roundRoubinLoadBalance*/ } from './load-balancer';

const SERVER_ADDRESS = Symbol('serverAddress');
// enum states {
//   normal,
//   discovery
// }

class NoneProviderError extends Error {
  constructor(consumer) {
    super();
    this.name = 'NoneProviderError';
    this.message = `Consumer - {interfaceName: ${consumer.interfaceName}, group: ${consumer.group || ''}, version: ${consumer.version || ''}} 不存在可用服务提供方`;
  }
}

class AllCircuitBreakersOpenedError extends Error {
  constructor(consumer) {
    super();
    this.name = 'AllCircuitBreakersOpenedError';
    this.message = `Consumer - {interfaceName: ${consumer.interfaceName}, group: ${consumer.group || ''}, version: ${consumer.version || ''}} 所有的服务提供方都被熔断了`;
  }
}

export class Consumer extends SDKBase {
    _client;
    _encoder: Encoder;
    options: ConsumerOptions;
    discoverer: Discoverer;
    [SERVER_ADDRESS] = [];

    get check() {
      return this.options.check;
    }

    get registry() {
      return this.options.registry;
    }

    get serverAddress() {
      return this[SERVER_ADDRESS];
    }

    get group() {
      return this.options.group;
    }

    get version() {
      return this.options.version;
    }

    get interfaceName() {
      return this.options.interfaceName;
    }

    get jsonRpcVersion() {
      return this.options.jsonRpcVersion;
    }

    get rpcMsgId() {
      return this.options.rpcMsgId;
    }

    set serverAddress(serverAddress) {
      this[SERVER_ADDRESS] = serverAddress
        .map(
          ({ protocol, hostname, port }) => new CircuitBreaker({
            meta: {
              protocol,
              hostname,
              port
            }
          })
        );
    }

    serverAddressList: Array<CircuitBreaker>;
    balancerLoad: Function;
    /*
      new Consumer({
        registry,
        interfaceName: 'com.xxx.yyy',
        dubboVersion: '2.8.4', // jsonRpcVersion: '2.0',
        version: '1.0.0',
        group: '',
        protocol: 'jsonrpc',
        methods: ['test']
        timeout: 3000,
        pool: {
          min: 2,
          max: 4,
          maxWaitingClients: 10,
          keepAlive: true
        }
      });
    */
    constructor(opts) {
      super(Object.assign({}, opts, {
        initMethod: '_init',
      }));

      let options = Object.assign({}, {
        dubboVersion: '2.8.0',
        jsonRpcVersion: '2.0',
        rpcMsgId: 1,
        version: '1.0',
        protocol: 'dubbo'
      }, opts);

      this._encoder = new Encoder(options);

      this._client = options.pool
        ? new ClientWithPool(options.pool)
        : new Client();

      this.options = options;
      this.balancerLoad = randomLoadBalance();
      assert(options.registry || options.serverHosts, 'rpcClient.createConsumer(options) 需要指定 options.serverHosts');
    }

    async invoke(method, args, headers = [], options: InvokeOptions = {}) {
      if (this.serverAddress.length === 0) {
        let noneError = new NoneProviderError(this);

        if (options.mock) {
          console.error(noneError);
          return options.mock;
        }
        throw noneError;
      }

      const { halfOpened, closed, opened } = CircuitBreaker.group(this.serverAddress);

      if (opened.length === this.serverAddress.length) {
        let allBreakError = new AllCircuitBreakersOpenedError(this);

        if (options.mock) {
          console.error(allBreakError);
          return options.mock;
        }
        throw allBreakError;
      }

      // @TODO
      // 1. 生成上下文信息
      // 1. protocol.encode
      // 2. 判断是否需要探活，生成对应的 serverAddress

      let item = null;

      //let state;

      if (halfOpened.length > 0 && this.isExploreTraffic() && options.retry === 1) {
        // 探活流量
        item = this.balancerLoad(halfOpened, 'halfOpened');
        //state = states.discovery;
      } else if (closed.length > 0) {
        // 正常访问
        item = this.balancerLoad(closed, 'closed');
        //state = states.normal;
      }

      if (!item) {
        return options.mock || 'remote service is unreachable';
      }

      // 3. Socket Pool 代理 socket 复用
      const { hostname, port } = item.meta;
      let encodeArgs = args;

      // 构造jsonRpc POST请求头
      if (this.options.protocol.toLowerCase() === 'jsonrpc') {
        headers.unshift(`POST /${this.options.interfaceName} HTTP/1.1`, `HOST: ${hostname}:${port}`);
        encodeArgs = {
          jsonrpc: this.jsonRpcVersion || '2.0',
          method,
          params: args,
          id: this.rpcMsgId || 1
        };
      }

      const buffer = this._encoder.encode(method, encodeArgs, headers);

      return this._client.request(hostname, port, buffer, this.options.protocol, options.timeout)
        .then((res) => {
        // 4.1 返回成功
        // 4.1.1 protocol.decode
        // 4.1.2 解析上下文信息
        // 4.1.3 CircuitBreaker.succ
          item.succ();
          return res;
        })
        .catch(err => {
        // 4.2 失败
        // 4.2.1 未超出 Retry阈值，Retry
        // 4.2.2 如果超出 Retry 阈值，降级（Mock）
        // 4.2.3 CircuitBreaker.failed
          console.error(err);
          item.failed();
          if (options.retry > 0) {
            options.retry = options.retry - 1;
            return this.invoke(method, args, headers, options);
          }
          return options.mock || 'remote service is unreachable';
        });
    }

    isExploreTraffic() {
      return Math.random() < 0.05;
    }

    // 抹平 注册中心模式 与 直连 模式的差异，最终生效的都为 this.serverAddress
    async _init() {
      if (this.registry) {
        await this.discovery();
      } else {
        this.direct();
      }

      if (this.check) {
        if (this.serverAddress.length === 0) {
          throw new NoneProviderError(this);
        }
      }
    }

    async discovery() {
      const discoverer = new Discoverer(this.options);
      discoverer.on('update:serverAddress', (serverAddress) => {
        this.serverAddress = serverAddress;
      });
      await discoverer.ready();
    }

    direct() {
      this.serverAddress = this.options.serverHosts.map(item => URL.parse(item));
    }

    async close() {
      await this._client._close();
    }
}