import createConsumer from './../../dist/client/create-consumer';
import createRegistry from './../../dist/client/create-registry';
import assert from 'assert';

describe('test/client/create-consumer.ts', () => {
    let registry;
    let consumer;
    before(async () => {
        registry = createRegistry({
            logger: console,
            zkHosts: '10.170.164.121:2181'
        });
        await registry.ready();
    });

    it ('createConsumer()', async () => {
        consumer = createConsumer({
            registry: registry,
            interfaceName: 'com.netease.haitao.message.service.MessageFatigueServiceFacade',
            methods: [
                'aaaa'
            ],
            check: true
        });
        try {
            await consumer.ready();
        } catch(e) {
            assert(e.name === 'NoneProviderError');
        }
    });

    it ('should consumer.invoke', async () => {
        try {
            await consumer.invoke('method', [1,2,3]);
        } catch(e) {
            assert(e.name === 'NoneProviderError');
        }
    })

    after(async function() {
        await registry.close();
        await consumer.close();
    })
})
