import { ProviderNode } from '../../interface/provider-node';
import { AddressManager } from '../address-manager';
import { InvokeOptions } from '../../interface/invoke-options';
import { Discoverer } from '../discoverer';
import { ConsumerOptions } from '../../interface/consumer-options';
import { Client, ClientWithPool } from '../client';
import Encoder from '../../tools/encoder';
import SDKBase from 'sdk-base';
import assert from 'assert';
import URL from 'url';
import querystring from 'querystring';
import { CircuitBreakerStates } from '../circuit-breaker';

const SERVER_ADDRESS = Symbol('serverAddress');

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
    [SERVER_ADDRESS]: AddressManager;

    get check() {
      return this.options.check;
    }

    get registry() {
      return this.options.registry;
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

    set serverAddress(serverAddress: Array<ProviderNode>) {
      if (!this[SERVER_ADDRESS]) {
        this[SERVER_ADDRESS] = new AddressManager(serverAddress);
      } else {
        this[SERVER_ADDRESS].reset(serverAddress);
      }
    }
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
        loadBalance: 'random',            //连接池中负载均衡方式，默认 ‘random’，可选 ‘random’，‘roundRobin’
        pool: {
          min: 2,                         //连接池最小连接数， 默认 2
          max: 4,                         //连接池最大连接数， 默认 4
          maxWaitingClients: 10,
          evictionRunIntervalMillis: 10000,   //轮询清理空闲太久未使用的连接的时间间隔，默认 10000ms
          idleTimeoutMillis: 180000,          //这段时间内连接未被使用会被当作空闲连接，然后被上述evict流程清理，默认 180000ms
          keepAlive: true
        },
        circuitBreaker: {
          openTimeout: 10000,               // 默认 10s，熔断时间窗口，熔断的连接等待10s后会尝试半开等待探活
          failLimit: 10,                    // 默认 10次，连接连续异常处理请求10次后被熔断
          succLimit: 3                      // 默认 3次， 连续成功处理请求3次后连接被打开
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
        version: '1.0',
        protocol: 'dubbo',
        loadBalance: 'random',
      }, opts);

      this._encoder = new Encoder(options);

      this._client = options.pool
        ? new ClientWithPool(options.pool)
        : new Client();

      this.options = options;

      assert(options.registry || options.serverHosts, 'rpcClient.createConsumer(options) 需要指定 options.serverHosts');
    }

    async invoke(method, args, headers = [], options: InvokeOptions = { rpcMsgId: 1 }) {
      const addressManager = this[SERVER_ADDRESS];
      if (!addressManager.hasProviders()) {
        let noneError = new NoneProviderError(this);

        if (options.mock) {
          console.error(noneError);
          return options.mock;
        }
        throw noneError;
      }

      if (!addressManager.hasAvaliable()) {
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

      let id: number = -1;
      let result: {id, data: ProviderNode} = null;
      let status;

      if (addressManager.has(CircuitBreakerStates.HalfOpened) && this.isExploreTraffic()) {
        // 探活流量
        status = CircuitBreakerStates.HalfOpened;
        result = addressManager.pick(status);
      } else if (addressManager.has(CircuitBreakerStates.Closed)) {
        // 正常访问
        status = CircuitBreakerStates.Closed;
        result = addressManager.pick(status);
      }

      if (!result) {
        return options.mock || 'remote service is unreachable & lack arguments \'options.mock\'. now you should wait it auto try request halfOpened service for a while.';
      }

      id = result.id;

      // 3. Socket Pool 代理 socket 复用
      const { hostname, port }: ProviderNode = result.data;
      let encodeArgs = args;

      let queryHeaders = [].concat(headers);

      // 构造jsonRpc POST请求头
      if (this.options.protocol.toLowerCase() === 'jsonrpc') {
        queryHeaders.unshift(`POST /${this.options.interfaceName} HTTP/1.1`, `HOST: ${hostname}:${port}`);
        encodeArgs = {
          jsonrpc: this.jsonRpcVersion || '2.0',
          method,
          params: args,
          id: options.rpcMsgId || 1
        };
      }

      const buffer = this._encoder.encode(method, encodeArgs, queryHeaders);

      return this._client.request(hostname, port, buffer, this.options.protocol, options.timeout)
        .then((res) => {
        // 4.1 返回成功
        // 4.1.1 protocol.decode
        // 4.1.2 解析上下文信息
        // 4.1.3 CircuitBreaker.succ
          addressManager.succ(id);
          return res;
        })
        .catch(err => {
        // 4.2 失败
        // 4.2.1 未超出 Retry阈值，Retry
        // 4.2.2 如果超出 Retry 阈值，降级（Mock）
        // 4.2.3 CircuitBreaker.failed
          addressManager.failed(id);
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
      this._initAddressManager();
      if (this.check) {
        if (!this[SERVER_ADDRESS].hasAvaliable()) {
          throw new NoneProviderError(this);
        }
      }
    }

    async _initAddressManager() {
      if (this.registry) {
        this.serverAddress = this.options.serverHosts.map(item => {
          const {
            protocol,
            hostname,
            port,
            query
          } = URL.parse(item);
          return {
            protocol,
            hostname,
            port,
            meta: querystring.parse(query)
          };
        });
      } else {
        const discoverer = new Discoverer(this.options);
        discoverer.on('update:serverAddress', (serverAddress) => {
          this.serverAddress = serverAddress;
        });
        await discoverer.ready();
      }
    }

    async close() {
      await this._client._close();
    }
}