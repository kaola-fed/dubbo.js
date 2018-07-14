import decode from '../../dist/tools/decoder';
import * as assert from 'assert';

describe('test/tool/decoder.ts', () => {
    let resp = null;
    let heap = 'HTTP/1.1 200 OK\r\nServer: Apache-Coyote/1.1\r\nContent-Length: 65\r\nDate: Tue, 10 Jul 2018 09:12:27 GMT\r\n\r\n{"jsonrpc":"2.0","id":1,"result":"123 from 10.165.205.234:9092"}\n';
    let wrongHeap = 'Service error 503';

    it('decode error heap', async () => {
        resp = await decode(wrongHeap, 'jsonrpc');
        assert.deepEqual(resp, {
            code: -1,
            msg: wrongHeap
          });
    });

    
})

