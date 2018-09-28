// Socket client with connection pool
import net from 'net';
import http from 'http';
import urllib from 'urllib';
import pTimeout from 'p-timeout';
import Pool from '../socket-pool';
import once from 'once';
//import BufferHelper from 'bufferhelper';
import decode from '../../tools/decoder';

const DEFAULT_BUFFER_LENGTH = 16;
const SOCKET_ERROR = 'SOCKET_ERROR';
const SOCKET_CLOSE_ERROR = 'SOCKET_CLOSE_ERROR';

/**
 *
 * @param chunk
 */
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

// const lenReg = /Content-Length: (\d+)\r\n/;
// const isChunked = /\r\nTransfer-Encoding: chunked\r\n/;

// const isover = (response) => {
//   try {
//     let chunked = response.match(isChunked);
//     if (chunked) {
//       let resp = response.split('\r\n\r\n');
//       let body = resp[1].split('\r\n');

//       if (Buffer.from(body[1]).length >= parseInt(body[0], 16)) {
//         const headers = resp[0].split('\r\n');
//         const code = headers[0].split(' ')[1];
//         return {
//           code,
//           body: JSON.parse(body[1])
//         };
//       }
//     } else {
//       let bodyLength = response.match(lenReg)[1];
//       let body = response.split('\r\n\r\n');
//       if (Buffer.from(body[1]).length >= bodyLength) {
//         const headers = body[0].split('\r\n');
//         const code = headers[0].split(' ')[1];
//         return {
//           code,
//           body: JSON.parse(body[1])
//         };
//       }
//     }

//     return null;
//   } catch (e) {
//     console.log(e);
//     return {
//       code: -1,
//       body: response
//     };
//   }
// };
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
        this._resolve = once(resolve);
        this._reject = once(reject);
        // let bufferHelper = new BufferHelper();
        let bufferLength = DEFAULT_BUFFER_LENGTH;
        // let overResult = null;
        const socket = this._socket;

        socket.on('error', err => {
          socket.destroy();
          err.code = SOCKET_ERROR;
          this._reject(err);
        });

        socket.on('data', chunk => {
          if (this._protocol.toLowerCase() === 'dubbo') {
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

  async _close() {
    throws('_close');
  }
  /**
   * send a request
   * @param host
   * @param port
   * @param buffer
   * @param protocol
   */
  request(host, port, buffer, protocol, timeout = 5000) {
    return pTimeout(Promise.resolve(this._socket(host, port))
      .then(socket =>
        new this._Request({
          socket,
          host,
          port,
          buffer,
          protocol
        }).start())
      , timeout);
  }
}

// With normal single-use socket
export class Client extends ClientBase {
  _client = null;
  constructor() {
    super(Request);
  }

  _socket() {
    this._client = new net.Socket();
    return this._client;
  }

  async _close() {
    if (this._client) {
      this._client.destroy();
    }
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

    /**
     *
     * @param host
     * @param port
     */
    _getPool(host, port) {
      const key = `${host}:${port}`;

      if (!this._pools[key]) {
        this._pools[key] = new Pool({
          pool: this._pool,
          connect: {
            host,
            port
          }
        });
      }

      return this._pools[key];
    }

    async _close() {
      for (let key in this._pools) {
        if ({}.hasOwnProperty.call(this._pools, key)) {
          let pool = this._pools[key];

          if (pool) {
            await pool.drain().then(() => pool.clear());
          }
        }
      }
    }
  /**
   * Acquire the socket connection from the pool
   * @param host
   * @param port
   */
    _socket(host, port) {
      const pool = this._getPool(host, Number(port));
      return pool.acquire();
    }
}

export class JsonRpcClient {
  agent = null;
  httpclient = null;

  constructor(option) {
    this.httpclient = option.httpclient || urllib.create();
    this.agent = option.agent || new http.Agent({
      keepAlive: true,
      maxSockets: 8
    });
  }

  async request(hostname, port, param, protocol, timeout) {
    return new Promise((resolve, reject) => {
      this.httpclient.request(`${hostname}${port ? `:${port}` : ''}/${param.path}`, {
        method: 'POST',
        data: param.data,
        timeout,
        agent: this.agent,
        dataType: 'json',
        contentType: 'json',
        headers: {
          Connection: 'keep-alive'
        }
      }, function (err, body) {
        if (err) {
          reject(err);
        } else {
          resolve({
            code: body.result.code,
            body
          });
        }
      });
    });
  }
}