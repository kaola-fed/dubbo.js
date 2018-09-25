import createRegistry from './../../dist/client/create-registry';
import assert from 'assert';

describe('test/client/create-registry-client.ts', () => {
    let client;
    it('new ZKClient()', () => {
        client = createRegistry({
            logger: console,
            zkHosts: 'kaola-test-dubbozk01.v1.kaola.jdb.vpc:2181,kaola-test-dubbozk02.v1.kaola.jdb.vpc:2181,kaola-test-dubbozk03.v1.kaola.jdb.vpc:2181'
        })
    });

    it('await zk.ready', async () => {
        await client.ready();
    });

    it('client logger is console', () => {
        assert.equal(client.logger, console);
    });

    it('await subscribe', async () => {
        const res = await new Promise(function(resolve) {
            client.subscribe({
                interfaceName: 'com.netease.kaola.compose.ic.service.goods.PublishGoodsCompose'
            }, (result: string[]) => {
                resolve(result);
            })
        });
        
        assert(Array.isArray(res));
    });

    it('unSubscribe', async () => {
        await client.unSubscribe({
            interfaceName: 'com.netease.kaola.compose.ic.service.goods.PublishGoodsCompose'
        })
    });

    after(async function() {
        await client.close();
    })
})
