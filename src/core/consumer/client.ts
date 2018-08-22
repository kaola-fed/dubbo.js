// Socket client with connection pool
import net from 'net';
import pTimeout from 'p-timeout';
import Pool from '../socket-pool';
import once from 'once';
import BufferHelper from 'bufferhelper';
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

/**
 * 计算字符串所占的内存字节数，默认使用UTF-8的编码方式计算
 * UTF-8 是一种可变长度的 Unicode 编码格式，使用一至四个字节为每个字符编码
 *
 * 000000 - 00007F(128个代码)      0zzzzzzz(00-7F)                             一个字节
 * 000080 - 0007FF(1920个代码)     110yyyyy(C0-DF) 10zzzzzz(80-BF)             两个字节
 * 000800 - 00D7FF
   00E000 - 00FFFF(61440个代码)    1110xxxx(E0-EF) 10yyyyyy 10zzzzzz           三个字节
 * 010000 - 10FFFF(1048576个代码)  11110www(F0-F7) 10xxxxxx 10yyyyyy 10zzzzzz  四个字节
 *
 * 注: Unicode在范围 D800-DFFF 中不存在任何字符
 *
 * @param  {String} str
 * @return {Number}
 */
const sizeof = (str) => {
  let total = 0;
  let charCode;
  let i;
  let len;

  for (i = 0, len = str.length; i < len; i++) {
    charCode = str.charCodeAt(i);
    if (charCode <= 0x007f) {
      total += 1;
    } else if (charCode <= 0x07ff) {
      total += 2;
    } else if (charCode <= 0xffff) {
      total += 3;
    } else {
      total += 4;
    }
  }

  return total;
};

const lenReg = /Content-Length: (\d+)\r\n/;
const isover = (response) => {
  const tmpResponse = response.toString();

  try {
    let bodyLength = tmpResponse.match(lenReg)[1];
    return sizeof(tmpResponse.split('\r\n\r\n')[1]) >= bodyLength;
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
        this._resolve = once(resolve);
        this._reject = once(reject);
        let bufferHelper = new BufferHelper();
        let bufferLength = DEFAULT_BUFFER_LENGTH;
        const socket = this._socket;

        socket.on('error', err => {
          socket.destroy();
          err.code = SOCKET_ERROR;
          this._reject(err);
        });

        socket.on('data', chunk => {
          if (this._protocol.toLowerCase() === 'jsonrpc') {
            // console.log('jsonRpc request done');
            bufferHelper.concat(chunk);

            this._heap = bufferHelper.toBuffer().toString();
            // TODO: 现在只处理了jsonrpc有content-length的返回，对trunk的返回结果未解析
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
