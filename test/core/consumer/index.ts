import { Consumer } from './../../../dist/core/consumer/index';
import assert from 'assert';
import createRegistry from '../../../dist/client/create-registry';

describe('test/core/consumer/index.ts', () => {
    let registry;
    let client;
    let consumer;
    before(() => {
        registry = createRegistry({
            logger: console,
            zkHosts: '10.170.164.121:2181'
        });
    });

    it ('new ConsumerDataClient({registry})', async () => {
        consumer = new Consumer({
            registry: registry,
            interfaceName: 'com.netease.haitao.message.service.MessageFatigueServiceFacade'
        });
        await consumer.ready();
    });

    it ('should consumer.serverAddressList.length > 0', async () => {
        assert(consumer.serverAddressList.length > 0);
    })

    it ('new Consumer({serverHosts})', async () => {
        consumer = new Consumer({
            interfaceName: 'com.netease.haitao.message.service.MessageFatigueServiceFacade',
            serverHosts: [
                '127.0.0.1:1990'
            ]
        });
        await consumer.ready();
    });

    after(async function() {
        await registry.close();
    })
})
