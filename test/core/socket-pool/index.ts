import Pool from './../../../dist/core/socket-pool/index';
import conf from '../../../example/config';
import assert from 'assert';

describe('test/core/socket-pool/index.ts', () => {
    let socketErrorPool,
        timeoutPool;
    it('new Pool()', () => {
        socketErrorPool = new Pool({
            pool: {
                max: 3,
                min: 1,
                keepAlive: false
            },
            connect: {
                host: '127.0.0.1',
                port: 1234
            },
            connectTimeout: 2000
        });

        timeoutPool = new Pool({
            pool: {
                max: 3,
                min: 1,
                keepAlive: false
            },
            connect: {
                host: conf.host,
                port: conf.port
            },
            connectTimeout: 1
        });
    });

    it('await pool.acquire SocketError', async () => {
        await socketErrorPool.acquire().catch(e => {
            assert.throws(function() { throw e; }, /SocketError: connect ECONNREFUSED/);
        });
    });

    it('await pool.acquire SocketError', async () => {
        await timeoutPool.acquire().catch(e => {
            assert.throws(function() { throw e; }, /TimeoutError: socket fails to connect to server/);
        });
    });

})
