import {
  createPool
} from 'generic-pool';

import Socket from './socket';

import {
  delegate
} from './delegate';

export class SocketError extends Error {
  constructor(message, err) {
    super(message);
    Object.assign(this, err);
    this.name = 'SocketError';
  }
}

export class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export default class Pool {
  _connectOptions;
  _connectTimeout;
  _pool;

  emit: Function;
  destroy: Function;
  clear: Function;

  constructor({
    // options of generic-pool
    pool,
    connect,
    connectTimeout = 5000,
    ...socket
  }) {

    // allowHalfOpen defaults to true
    socket.allowHalfOpen = socket.allowHalfOpen === false
      ? false
      : true;

    this._connectOptions = connect;
    this._connectTimeout = connectTimeout;

    this._pool = createPool({
      create: () => {
        const s = new Socket(socket);
        if (pool.keepAlive === true) {
          s.setKeepAlive(true);
        }
        s._pool = this;
        return s;
      },

      destroy: socket => {
        socket._pool = null;
        socket.destroy();
        this.emit('factoryDestroy');
      }
    }, pool);
  }
  /**
   * get a free available socket
   * @param priority
   */
  acquire(priority) {
    return this._pool.acquire(priority)
      .then(socket => {
        return socket.connect(this._connectOptions, this._connectTimeout)
          .then(socket => {
            this.emit('factoryCreate');
            return socket;
          })
          .catch(err => {
            this.destroy(socket);

            if (err.name === 'TimeoutError') {
              const error = new TimeoutError(`acquire a socket fails to connect to server after ${this._connectTimeout} milliseconds`);
              return Promise.reject(error);
            }

            const error = new SocketError(err.message, err);
            return Promise.reject(error);
          });
      });
  }
}


delegate(Pool, '_pool', [
  'on',
  'emit',
  'once',
  'drain',
  'clear',
  'destroy',
  'release'
]);
