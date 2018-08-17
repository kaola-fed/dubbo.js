import {
  Socket as _Socket
} from 'net';

import pTimeout from 'p-timeout';

import {
  delegate
} from './delegate';


const isValidTimeout = timeout => typeof timeout === 'number' && timeout > 0;

export default class Socket {
    _socket;
    _pool = null;
    _destroyed = false;
    _connected = false;

    on: Function;
    setKeepAlive: Function;
    removeAllListeners: Function;

    constructor(options) {
      this._socket = new _Socket(options);

      this._socket.once('end', () => this.destroy());
    }
    /**
     *
     * @param config
     * @param timeout
     */
    connect(config, timeout) {
      if (this._connected && this._socket.readable) {
        return Promise.resolve(this);
      }

      this._connected = true;

      const waitForConnected = this._connect(config);

      if (!isValidTimeout(timeout)) {
        return waitForConnected;
      }

      return pTimeout(waitForConnected, timeout, 'TimeoutError');
    }

    _connect(config) {
      const {
        path
      } = config;
      const self = this;

      return new Promise((resolve, reject) => {
        if (path) {
          this._socket.connect(path);
        } else {
          this._socket.connect(config.port, config.host);
        }

        this._socket.on('connect', () => {
          // Then remove error listener for reject
          self.removeAllListeners('error');
          console.log('--- connect to remote service ---');
          resolve(self);
        });

        this._socket.on('error', err => {
          reject(err);
        });
      });
    }

    release() {
      this.removeAllListeners();
      this._socket.removeAllListeners();

      if (this._pool) {
        // console.log('-- release socket --');
        this._pool.release(this);
      }
    }

    destroy() {
      if (this._destroyed) {
        return;
      }

      this._destroyed = true;

      this.removeAllListeners();
      this._socket.destroy();

      if (!this._pool) {
        return;
      }

      this._pool.destroy(this);
      this._pool = null;
    }
}


delegate(Socket, '_socket', [
  'on',
  'setKeepAlive',
  'removeAllListeners',
  'once',
  'write',
  'end'
]);
