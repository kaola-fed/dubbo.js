import assert from 'assert';
import { Discoverer } from './../../../dist/core/consumer/discoverer';

describe('test/core/consumer/discoverer.ts', () => {
    let discoverer,
        providers;
    let addressList = [
        'dubbo://127.0.0.1:80/com.demo.serviceA?group=demo&methods=m1,m2,m3',
        'dubbo://127.0.0.1:81/com.demo.serviceB?group=demo&methods=m1,m2',
        'dubbo://127.0.0.1:81/com.demo.serviceC?group=test&methods=m1,m2',
        'jsonrpc://127.0.0.1:82/com.demo.serviceD?group=demo&methods=m1,m2',
    ];
    let registry = {
        subscribe: (inter, cb: Function) => {
            setTimeout(function() {
                cb(addressList);
            }, 40);
        }
    };

    let options = {
        registry,
        interfaceName: 'test',
        dubboVersion: '2.8.8.0',
        version: '',
        group: 'demo',
        protocol: 'dubbo',
        timeout: 3000,
        pool: {
          min: 2,
          max: 4,
          maxWaitingClients: 10,
          keepAlive: true
        }
    };

    it ('new Discoverer(options)', async () => {
        discoverer = new Discoverer(options);
        await new Promise((resolve) => {
            discoverer.on('update:serverAddress', (serverAddress) => {
                assert.deepEqual(serverAddress,[{
                    protocol: 'dubbo:',
                    hostname: '127.0.0.1',
                    port: '80',
                    meta: { 
                        group: 'demo', 
                        methods: 'm1,m2,m3' 
                    } 
                }, { 
                    protocol: 'dubbo:',
                    hostname: '127.0.0.1',
                    port: '81',
                    meta: { 
                        group: 'demo', 
                        methods: 'm1,m2' 
                    } 
                }]);
            });
            resolve();
        });

        assert.equal(discoverer.check, undefined);
        assert.equal(discoverer.registry, registry);
        assert.equal(discoverer.interfaceName, 'test');
        assert.equal(discoverer.methods, undefined);
        assert.equal(discoverer.group, 'demo');
        assert.equal(discoverer.version, '');
        assert.equal(discoverer.protocol, 'dubbo');
    });

    it('should retun providers', async () => {
        providers = Discoverer.getProviderList(addressList);
        
        assert.deepEqual(providers, [{ 
            protocol: 'dubbo:',
            hostname: '127.0.0.1',
            port: '80',
            meta: { 
                group: 'demo', 
                methods: 'm1,m2,m3' 
            } 
        }, { 
            protocol: 'dubbo:',
            hostname: '127.0.0.1',
            port: '81',
            meta: { 
                group: 'demo', 
                methods: 'm1,m2' 
            } 
        },
        { 
            protocol: 'dubbo:',
            hostname: '127.0.0.1',
            port: '81',
            meta: { 
                group: 'test', 
                methods: 'm1,m2' 
            } 
        },
        { 
            protocol: 'jsonrpc:',
            hostname: '127.0.0.1',
            port: '82',
            meta: { 
                group: 'demo', 
                methods: 'm1,m2' 
            } 
        }]);
    });

    it('should return thoes providers include needed methods', async () => {
        
    });
});
