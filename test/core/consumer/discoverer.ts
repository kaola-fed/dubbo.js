import assert from 'assert';
import { Discoverer } from './../../../dist/core/consumer/discoverer';

describe('test/core/consumer/discoverer.ts', () => {
    let discoverer,
        providers;
    let addressList = [
        'dubbo://127.0.0.1:80/com.demo.serviceA?group=demo&methods=m1,m2,m3',
        'dubbo://127.0.0.1:81/com.demo.serviceB?group=demo&version=1.0&methods=',
        'dubbo://127.0.0.1:81/com.demo.serviceC?group=test&version=1.0&methods=m1,m2',
        'jsonrpc://127.0.0.1:82/com.demo.serviceD?group=demo&methods=m1,m2',
        'dubbo://127.0.0.1:82/com.demo.serviceE?group=&version=1.0&methods='
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

    it ('should throw invaled options.registry error', async () => {
        new Discoverer(Object.assign({}, options, {registry: null}));
        new Discoverer(Object.assign({}, options, {registry: {host: '1.1.1.1'}})); 
    });

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
                        version: '1.0',
                        methods: '' 
                    } 
                }]);
            });
            resolve();
        });

        assert.deepEqual(discoverer.options, options);
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
                version: '1.0',
                methods: '' 
            } 
        },
        { 
            protocol: 'dubbo:',
            hostname: '127.0.0.1',
            port: '81',
            meta: { 
                group: 'test',  
                version: '1.0',
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
        },
        { 
            protocol: 'dubbo:',
            hostname: '127.0.0.1',
            port: '82',
            meta: { 
                group: '', 
                version: '1.0',
                methods: '' 
            } 
        }]);
    });

    it('should return thoes providers include needed methods', async () => {
        const methods1 = [],
            methods2 = ['m1', 'm2'],
            methods3 = ['m3'];
        
        assert.deepEqual(Discoverer.checkMethods(providers, null), providers);
        assert.deepEqual(Discoverer.checkMethods(providers, methods1), providers);
        assert.deepEqual(Discoverer.checkMethods(providers, methods2), [providers[0], providers[2], providers[3]]);
        assert.deepEqual(Discoverer.checkMethods(providers, methods3), [providers[0]]);
    });

    it('should return thoes providers match protocol&group&version', async () => {
        const discoverer = new Discoverer(Object.assign({}, options, {
            version: '1.0',
            group: 'demo',
            protocol: 'dubbo',
        })), discoverer1 = new Discoverer(Object.assign({}, options, {
            version: '',
            group: '',
            protocol: '',
        }));

        assert.deepEqual(discoverer.filterProvider(providers), [{ 
            protocol: 'dubbo:',
            hostname: '127.0.0.1',
            port: '81',
            meta: { 
                group: 'demo',  
                version: '1.0',
                methods: '' 
            } 
        }]);
        assert.deepEqual(discoverer1.filterProvider(providers), providers);        
    });
});
