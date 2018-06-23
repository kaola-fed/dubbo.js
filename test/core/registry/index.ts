import { ZKClient } from './../../../dist/core/registry/index';
import assert from 'assert';

describe('test/core/registry/index.ts', () => {
    let zk;
    it('new ZKClient()', () => {
        zk = new ZKClient({
            logger: console,
            zkHosts: '10.170.164.121:2181'
        });
    });

    it('await zk.ready', async () => {
        await zk.ready();
    });


    it('await subscribe', async () => {
        const res = await new Promise(function(resolve) {
            zk.subscribe({
                interfaceName: 'com.netease.haitao.message.service.MessageFatigueServiceFacade'
            }, (result: string[]) => {
                resolve(result);
            })
        });

        assert(res[0].startsWith('dubbo://'));
    });

    after(async function() {
        await zk.close((e?) => {});
    })
})
