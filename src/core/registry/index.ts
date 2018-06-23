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

      this._zkClient = this.options.zookeeper.createClient(this.zkHosts);
    }

    async _init() {
      await this._zkClient.await('connected');
    }

    async subscribe({
      interfaceName,
      protocol,
      uniqueId,
      timeout,
      appName
    }, listener) {
      this.on(interfaceName, listener);

      if (!this._subscribeMap.has(interfaceName)) {
        this._subscribeMap.set(interfaceName, null);
        const providerPath = this.buildProviderPath(interfaceName);
        await this._zkClient.mkdirp(providerPath);

        this._zkClient.watchChildren(providerPath, (err, children) => {
          if (err) {
            return this.emit('error', err);
          }

          const addressList = children.map(url => decodeURIComponent(url));

          this.emit(interfaceName, addressList);

          this._subscribeMap.set(interfaceName, addressList);
        });

        const consumerPath = this.buildConsumerPath(interfaceName);
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

        try {
          await this._zkClient.mkdirp(consumerPath);
          await this._zkClient.create(path, EMPTY, CreateMode.EPHEMERAL);
        } catch (e) {
          this.logger.warn('[ZookeeperRegistry] create consumerPath: %s failed, caused by %s', path, e.message);
        }
      } else {
        const addressList = this._subscribeMap.get(interfaceName);
        if (addressList) {
          setImmediate(() => { listener(addressList) });
        }
      }
    }

    // unSubscribe(config, listener) {

    // }

    buildProviderPath(interfaceName) {
      return `/${this.root}/${interfaceName}/providers`;
    }

    buildConsumerPath(interfaceName) {
      return `/${this.root}/${interfaceName}/consumers`;
    }

    async close(callback) {
      try {
        await this._zkClient.close();
        callback();
      } catch (e) {
        callback(e);
      }
    }
}