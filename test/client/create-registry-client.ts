import createRegistryClient from './../../dist/client/create-registry-client';
import assert from 'assert';

describe('test/client/create-registry-client.ts', () => {
    let client;
    it('new ZKClient()', () => {
        client = createRegistryClient({
            logger: console,
            zkHosts: '10.170.164.121:2181'
        })
    });

    it('await zk.ready', async () => {
        await client.ready();
    });


    it('await subscribe', async () => {
        const res = await new Promise(function(resolve) {
            client.subscribe({
                interfaceName: 'com.netease.haitao.message.service.MessageFatigueServiceFacade'
            }, (result: string[]) => {
                resolve(result);
            })
        });

        assert(res[0].startsWith('dubbo://'));
    });

    it('unSubscribe', async () => {
        await client.unSubscribe({
            interfaceName: 'com.netease.haitao.message.service.MessageFatigueServiceFacade'
        })
    });

    after(async function() {
        await client.close();
    })
})
