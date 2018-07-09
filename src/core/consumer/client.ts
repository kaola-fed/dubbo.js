// Socket client with connection pool
import net from 'net';

import Pool from '../socket-pool';
import once from 'once';

import decode from '../../tools/decoder';

const DEFAULT_BUFFER_LENGTH = 16;
const SOCKET_ERROR = 'SOCKET_ERROR';
const SOCKET_CLOSE_ERROR = 'SOCKET_CLOSE_ERROR';

const extraLength = chunk => {
  const arr = Array.prototype.slice.call(chunk.slice(0, 16));
  let i = 0;
  let extra = 0;

  while (i < 3) {
    extra += arr.pop() * Math.pow(256, i++);
  }

  return extra;
};

const throws = name => {
  throw new Error(`${name} must be implemented`);
};

const lenReg = /Content-Length: (\d+)\r\n/;

const isover = (response) => {
  try {
    let bodyLength = response.match(lenReg)[1];
    return response.split('\r\n\r\n')[1].length >= bodyLength;
  } catch (e) {
    return true;
  }
};

class RequestBase {
    _socket;
    _host;
    _port;
    _buffer;
    _protocol;
    _resolve = null;
    _reject = null;
    _chunks = [];
    _heap = null;

    constructor({
      socket,
      host,
      port,
      buffer,
      protocol
    }) {
      this._socket = socket;
      this._host = host;
      this._port = port;
      this._buffer = buffer;
      this._protocol = protocol;
    }

    _write() {
      throws('_write');
    }

    _release() {
      throws('_release');
    }

    _done() {
      throws('_done');
    }

    _decode() {
      decode(this._heap, this._protocol).then(this._resolve, this._reject);
    }

    start() {
      return new Promise((resolve, reject) => {
        this._resolve = resolve = once(resolve);
        this._reject = reject = once(reject);
        let bufferLength = DEFAULT_BUFFER_LENGTH;
        const socket = this._socket;

        socket.on('error', err => {
          socket.destroy();
          err.code = SOCKET_ERROR;
          reject(err);
        });

        socket.on('data', chunk => {
          if (this._protocol.toLowerCase() === 'jsonrpc') {
            // console.log('jsonRpc request done');
            this._heap += chunk.toString();

            if (isover(this._heap)) {
              this._done();
            }
          } else if (this._protocol.toLowerCase() === 'dubbo') {
            const chunks = this._chunks;
            if (!chunks.length) {
              bufferLength += extraLength(chunk);
            }
            chunks.push(chunk);
            const heap = this._heap = Buffer.concat(chunks);

            if (heap.length >= bufferLength) {
              // console.log('dubbo request done');
              this._done();
            }
          }
        });

        this._write();
      });
    }
}

// Basic request for normal single-use socket connection
class Request extends RequestBase {
  _write() {
    const socket = this._socket;

    socket.on('close', err => {
      if (err) {
        err.code = SOCKET_CLOSE_ERROR;
        return this._reject(err);
      }

      this._decode();
    });

    socket.connect(this._port, this._host, () => {
      socket.write(this._buffer);
    });
  }

  _done() {
    this._socket.destroy();
  }
}

// Request for reusable socket
class RequestForPool extends RequestBase {
  _write() {
    this._socket.write(this._buffer);
  }

  _done() {
    this._socket.release();
    this._decode();
  }
}

class ClientBase {
  _Request;

  constructor(Request) {
    this._Request = Request;
  }

  _socket(...args) {
    throws('_socket');
  }

  request(host, port, buffer, protocol) {
    return Promise.resolve(this._socket(host, port))
      .then(socket =>
        new this._Request({
          socket,
          host,
          port,
          buffer,
          protocol
        }).start()
      );
  }
}

// With normal single-use socket
export class Client extends ClientBase {
  constructor() {
    super(Request);
  }

  _socket() {
    return new net.Socket();
  }
}

// With socket pool
export class ClientWithPool extends ClientBase {
    _pool = null;
    _pools = {};
    constructor(pool) {
      super(RequestForPool);

      this._pool = pool;
    }

    _getPool(host, port) {
      const key = `${host}:${port}`;
      return this._pools[key] || (
        this._pools[key] = new Pool({
          pool: this._pool,
          connect: {
            host,
            port
          }
        })
      );
    }

  // Acquire the socket connection from the pool
    _socket(host, port) {
      const pool = this._getPool(host, Number(port));
      return pool.acquire();
    }
}
