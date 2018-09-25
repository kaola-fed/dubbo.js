import { DecoderV2 } from 'hessian.js';

const RESPONSE_OK             = 20;
const RESPONSE_WITH_EXCEPTION = 0;
const RESPONSE_VALUE          = 1;
const RESPONSE_NULL_VALUE     = 2;
/**
 * 解码接收到的服务端信息
 * @param income
 * @param protocol
 */
export default function decode(income, protocol) {
  let heap = income;
  if (protocol.toLowerCase() === 'jsonrpc') {
    return Promise.resolve(heap);
  }

  let flag; let
    result;

  if (heap[3] !== RESPONSE_OK) {
    return Promise.resolve(heap.slice(18, heap.length - 1).toString());
  }

  try {
    result = new DecoderV2(heap.slice(16, heap.length));
    flag = result.readInt();
    const e = result.read();

    switch (flag) {
      case RESPONSE_NULL_VALUE:
        return Promise.resolve(null);

      case RESPONSE_VALUE:
        return Promise.resolve(e);

      case RESPONSE_WITH_EXCEPTION:
        return Promise.reject(
          e instanceof Error
            ? e
            : new Error(e)
        );

      default:
        return Promise.reject(
          new Error(`Unknown result flag, expect '0' '1' '2', get ${flag}`)
        );
    }

  } catch (err) {
    return Promise.reject(err);
  }
}
