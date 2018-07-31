import Socket from './../../../dist/core/socket-pool/socket';
import conf from '../../../example/config';
import assert from 'assert';

describe('test/core/socket-pool/socket.ts', () => {
    let socket = null;
    it('new Socket()', () => {
        socket = new Socket({
            pool: null,
            connect: null
        });
    });

    it('connect path', async () => {
        socket.connect({
            path: '/',
            timeout: -1
        }).catch(e => {
            assert.throws(function() { throw e; }, /Error: connect ENOTSOCK/);
        });
    });

    it('return socket when connected', async () => {
        socket._connected = true;
        let client =  await socket.connect({
            path: '/',
            timeout: -1
        });

        assert.equal(client, socket);
    });

    it('socket end', async () => {
        socket._socket.emit('end');
    });

})

