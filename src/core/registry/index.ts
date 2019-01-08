// eslint-disable-next-line
import { Logger } from './../../interface/logger';
import { ZKClientOptions } from '../../interface/zk-client-options';
import SDKBase from 'sdk-base';
import zookeeper from 'zookeeper-cluster-client';
import assert from 'assert';
import { format } from 'util';
import { ip } from 'address';

const EMPTY = Buffer.from('');
const localIp = ip();
const { CreateMode } = zookeeper;

export class ZKClient extends SDKBase {
    options: ZKClientOptions;
    _zkClient;
    _subscribeMap = new Map();

    get logger() {
      return this.options.logger;
    }

    get zookeeper() {
      return this.options.zookeeper;
    }

    get root() {
      return this.options.root || 'dubbo';
    }

    get zkHosts() {
      return this.options.zkHosts;
    }

    constructor(options) {
      super({
        initMethod: '_init',
      });

      this.options = Object.assign({
        zookeeper,
        ephemeralNode: true,
      }, options);

      assert(options.zkHosts, '请传入 zkHosts');

      let zkClusterOptions = options.cluster ? { cluster: options.cluster } : {};
      zkClusterOptions = Object.assign({}, {
        retries: 5,
        spinDelay: 500,
        sessionTimeout: 5000
      }, zkClusterOptions);

      this._zkClient = this.options.zookeeper.createClient(this.zkHosts, zkClusterOptions);
      this._zkClient.on('disconnected', () => {
        this.logger.error('The connection between zk client and server is dropped.');
      });
    }

    async _init() {
      await this._zkClient.await('connected');
    }

    buildConsumerPath(consumerPath, {
      protocol,
      uniqueId,
      timeout,
      appName
    }) {
      const consumerUrl = format(
        '%s://%s?uniqueId=%s&version=%s&pid=%s&timeout=%s&appName=%s&serialization=%s&startTime=',
        protocol,
        localIp,
        uniqueId || '',
        '1.0',
        process.pid,
        timeout,
        appName || '',
        Date.now()
      );

      const path = consumerPath + '/' + encodeURIComponent(consumerUrl);

      return path;
    }

    async registerConsumer({
      interfaceName,
      protocol,
      uniqueId,
      timeout,
      appName
    }) {
      const consumerPath = this.buildConsumerRoot(interfaceName);
      const path = this.buildConsumerPath(consumerPath, {
        protocol,
        uniqueId,
        timeout,
        appName
      });
      try {
        await this._zkClient.mkdirp(consumerPath);
        await this._zkClient.create(path, EMPTY, CreateMode.EPHEMERAL);
      } catch (e) {
        this.logger.warn('[ZookeeperRegistry] create consumerPath: %s failed, caused by %s', path, e.message);
      }
    }

    async subscribe(options, listener) {
      const { interfaceName } = options;
      this.on(interfaceName, listener);
      if (!this._subscribeMap.has(interfaceName)) {
        this._subscribeMap.set(interfaceName, null);

        const providerPath = this.buildProviderRoot(interfaceName);
        await this._zkClient.mkdirp(providerPath);
        await this.registerConsumer(options);

        this._zkClient.watchChildren(providerPath, (err, children) => {
          if (err) {
            return this.emit('error', err);
          }

          const addressList = children.map(url => decodeURIComponent(url));
          this.emit(interfaceName, addressList);
          this._subscribeMap.set(interfaceName, addressList);
        });
      } else {
        const addressList = this._subscribeMap.get(interfaceName);
        if (addressList) {
          setImmediate(() => { listener(addressList) });
        }
      }
    }

    async unSubscribe({
      interfaceName,
      protocol,
      uniqueId,
      timeout,
      appName
    }, listener) {
      assert(interfaceName, '[ZookeeperRegistry] unSubscribe(config, listener) config.interfaceName is required');

      if (listener) {
        this.removeListener(interfaceName, listener);
      } else {
        this.removeAllListeners(interfaceName);
      }

      if (this.listenerCount(interfaceName) === 0) {
        const providerPath = this.buildProviderRoot(interfaceName);
        await this._zkClient.unWatchChildren(providerPath);
        this._subscribeMap.delete(interfaceName);
        // const consumerRoot = this.buildConsumerRoot(interfaceName)
        // const children = await this._zkClient.getChildren(consumerRoot);
        // await this._zkClient.remove(path);
      }
    }

    buildProviderRoot(interfaceName) {
      return `/${this.root}/${interfaceName}/providers`;
    }

    buildConsumerRoot(interfaceName) {
      return `/${this.root}/${interfaceName}/consumers`;
    }

    async close() {
      await this._zkClient.close();
    }
}