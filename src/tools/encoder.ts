import { EncoderV2 } from 'hessian.js';
import semver from 'semver';

const STR_DOT = '.';

function cleanVersion(version) {
  const splitted = version.split(STR_DOT);
  const prefix = splitted.slice(0, 3);
  const suffix = splitted.slice(3);

  prefix.length = 3;

  return prefix.map(x => x || '0').join(STR_DOT) + (
    suffix.length
      ? '-' + suffix.join(STR_DOT)
      : ''
  );
}

function gte(a, b) {
  return semver.gte(cleanVersion(a), cleanVersion(b));
}

// 8 * 1024 * 1024 default body max length
const DEFAULT_LEN  = 8388608;

const ENUM_TYPE = {
  boolean: 'Z',
  int: 'I',
  short: 'S',
  long: 'J',
  double: 'D',
  float: 'F'
};

export default class Encoder {
    _attachments;
    _dubboVersion;
    _interface;
    _version;
    _group;
    _timeout;
    _gte280;
    _protocol;

    constructor({
      dubboVersion,
      interfaceName: _interface,
      version,
      group,
      timeout,
      protocol: _protocol
    }) {

      this._dubboVersion = dubboVersion;
      this._interface = _interface;
      this._protocol = _protocol;
      this._version = version;
      this._group = group;
      this._timeout = timeout;
      this._gte280 = gte(dubboVersion, '2.8.0');

      const implicitArgs = {
        interfaceName: _interface,
        path: _interface,
        timeout,
        version,
        group
      };

      if (version) {
        implicitArgs.version = version;
      }

      if (group) {
        implicitArgs.group = group;
      }

      this._attachments = {
        $class: 'java.util.HashMap',
        $: implicitArgs
      };
    }
    /**
     * 构造请求体，编码请求头及请求消息体
     * @param method
     * @param args
     * @param headers
     */
    encode(method, args, headers) {
      if (this._protocol === 'dubbo') {
        const body = this._body(method, args);
        const head = this._head(body.length);
        return Buffer.concat([head, body]);
      }

      const body = this._jsonRpcBody(args);
      const head = this._jsonRpcHead(body.length, headers);
      return head + body;
    }

    _jsonRpcHead(len, headers) {
      let head = [];
      head.push(headers.join('\r\n'));
      head.push('Connection: keep-alive');
      head.push(`Content-Length: ${len}`);
      head.push('Content-type: application/json;charset=utf-8');
      return `${head.join('\r\n')}\r\n\r\n`;
    }

    _jsonRpcBody(args) {
      return JSON.stringify(args);
    }

    _head(l) {
      const head = [0xda, 0xbb, 0xc2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      if (l > DEFAULT_LEN) {
        throw new Error(`Data length too large: ${l}, max payload: ${DEFAULT_LEN}`);
      }

      let i = 15;


      let len = l;
      while (len >= 256) {
        head.splice(i--, 1, len % 256);
        len >>= 8;
      }
      head.splice(i, 1, len);

      return Buffer.from(head);
    }

    _body(method, args) {
      const encoder = new EncoderV2();

      encoder.write(this._dubboVersion);
      encoder.write(this._group + '/' + this._interface);
      encoder.write(this._version);
      encoder.write(method);

      let index;
      let len = args.length;

      // 调服务的方法的参数描述符
      let type;
      let _paramTypes = '';
      if (args && len) {
        for (index = 0; index < len; index++) {
          type = args[index]['$class'];
          _paramTypes += type && type.indexOf('.') !== -1
            ? 'L' + type.replace(/\./gi, '/') + ';'
            : ENUM_TYPE[type];
        }
      }
      encoder.write(_paramTypes);

      // 遍历传输的参数值逐个序列化
      if (args && len) {
        for (index = 0; index < len; index++) {
          encoder.write(args[index]);
        }
      }

      // 将整个附属信息map对象attachments序列化
      encoder.write(this._attachments);

      let byteBuffer = encoder.byteBuffer;
      byteBuffer = byteBuffer.get(0, encoder.byteBuffer._offset);
      return byteBuffer;
    }
}
