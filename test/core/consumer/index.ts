import { createRegistry, createRpcClient } from '../../../dist';
import { ConsumerOptions } from '../../../dist/interface/consumer-options';
import { Consumer } from './../../../dist/core/consumer/index';
import conf from '../../../example/config';
import assert from 'assert';

enum states {
    Closed,
    Opend,
    HalfOpened,
}

describe('test/core/consumer/index.ts', () => {
    let registry;
    let client;
    let consumer;

    before(() => {
        registry = createRegistry({
            logger: console,
            zkHosts: 'kaola-test-dubbozk01.v1.kaola.jdb.vpc:2181,kaola-test-dubbozk02.v1.kaola.jdb.vpc:2181,kaola-test-dubbozk03.v1.kaola.jdb.vpc:2181'
        });

    });

    it ('new ConsumerDataClient of unexist', async () => {
        consumer = new Consumer({
            registry: registry,
            interfaceName: 'com.netease.haitao.message.service.xxxx',
            dubboVersion: '3.0.1',
            version: '1.0',
            group: 'perfor',
            protocol: 'jsonrpc',
            check: true
        });

        await consumer.ready().catch(e => {
            assert.throws(function() { throw e; }, /不存在可用服务提供方/);
        });

        await consumer.invoke('test', [], []).catch(e => {
            assert.throws(function() { throw e; }, /不存在可用服务提供方/);
        });

        await consumer.close();
    });

    it ('new ConsumerDataClient({registry})', async () => {
        consumer = new Consumer({
            registry: registry,
            interfaceName: 'com.netease.haitao.message.service.MessageFatigueServiceFacade'
        });

        await consumer.ready();
    });

    it ('new ConsumerDataClient({registry}) with socket pool', async () => {
        consumer = new Consumer({
            registry: registry,
            interfaceName: 'com.netease.kaola.compose.ic.service.goods.PublishGoodsCompose',
            pool: {
                min: 2,
                max: 4,
                maxWaitingClients: 10,
                keepAlive: true
            },
            check: true
        });
        await consumer.ready();
    });

    it ('should consumer.serverAddressList.length > 0', async () => {
        assert(consumer.serverAddress.length > 0);
    })

    it ('new Consumer({serverHosts})', async () => {
        consumer = new Consumer({
            interfaceName: 'com.netease.kaola.compose.ic.service.goods.PublishGoodsCompose',
            dubboVersion: '3.0.1',
            version: '1.0',
            group: 'perfor',
            protocol: 'jsonrpc',
            serverHosts: [
                'jsonrpc://127.0.0.1:81/com.demo.serviceC?group=test&version=1.0&methods=m1,m2'
            ]
        });
        await consumer.ready();
    });

    // it('invoke when all service break opened', async () => {
    //     consumer.serverAddress[0].limit = 1;
    //     consumer.serverAddress[0].failed();

    //     await consumer.invoke('m1', [], []).catch(e => {
    //         assert.throws(function() { throw e; }, /所有的服务提供方都被熔断了/);
    //     });        
    // });

    it('invoke when there is no available item', async () => {
        consumer.serverAddress[0].state = states.HalfOpened;
        let res = await consumer.invoke('m1', [], []);

        assert.equal(res, 'remote service is unreachable & lack arguments \'options.mock\'. now you should wait it auto try request halfOpened service for a while.');
    });

    it('invoke a jsonrpc method okay', async () => {
        consumer = new Consumer({
            registry: null,
            interfaceName: conf.jsonPath,
            dubboVersion: '3.0.6-SNAPSHOT',
            version: '',
            methods: ['findAttachments'],
            serverHosts: [conf.actualServer],
            group: 'performance',
            protocol: 'jsonrpc',
            timeout: 3000,
            pool: {
                min: 2,
                max: 4,
                maxWaitingClients: 10,
                keepAlive: true
            },
            check: false
        });


        await consumer.ready();
        const res = await consumer.invoke('findAttachments', ['k1'], ['Dubbo-Attachments: k1=aa,k2=bb,k3=123'], {
            retry: 1
        });

        assert.deepEqual(res, { code: '200',
        body: { jsonrpc: '2.0', id: 1, result: 'aa from 10.165.205.234:9092' } });

        await consumer.close();
    });

    it('invoke a dubbo method okay', async () => {
        consumer = new Consumer({
            dubboVersion: '3.0.6-SNAPSHOT',
            version: '',
            group: 'performance',
            protocol: 'dubbo',
            timeout: 3000,
            pool: null,
            registry: null,
            interfaceName: conf.dubboPath,
            methods: ['getUser', 'registerUser'],
            serverHosts: [conf.actualDubbo],
            check: false
        });

        await consumer.ready();
        const res = await consumer.invoke('getUser', [{
            $class: 'java.lang.Long',
            $: 2
        }], [], {
            retry: 3
        });
        
        assert.deepEqual(res, { id: 2, name: 'username2' });
        await consumer.close();
    });    

    after(async function() {
        await registry.close();
    })
})
