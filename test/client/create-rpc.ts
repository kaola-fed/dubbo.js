import createRpcClient from './../../dist/client/create-rpc';
import createRegistry from './../../dist/client/create-registry';
import assert from 'assert';

describe('test/client/create-rpc.ts', () => {
    let registry;
    let client;
    let consumer;
    before(() => {
        registry = createRegistry({
            logger: console,
            zkHosts: '10.170.164.121:2181'
        });
        client = createRpcClient({
            registry: registry,
        });
    });

    // it ('rpc.createConsumer()', async () => {
    //     consumer = client.createConsumer({
    //         interfaceName: 'com.netease.haitao.message.service.MessageFatigueServiceFacade'
    //     });
    //     await consumer.ready();
    // });

    // it ('should consumer.serverAddressList.length > 0', async () => {
    //     assert(consumer.serverAddressList.length > 0);
    // })

    after(async function() {
        await registry.close();
    })
})
