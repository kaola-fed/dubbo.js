import assert from 'assert';
import { CircuitBreaker } from './../../../dist/core/consumer/circuit-breaker';

enum states {
    Closed,
    Opend,
    HalfOpened,
};

describe('test/core/consumer/circuit-breaker.ts', () => {
    let circuit;
    let limit = 3;
    let timeout = 10;
    let options = {
        meta: {
            hostname: '127.0.0.1',
            port: 80
        }
    };

    it ('new CircuitBreaker(options)', async () => {
        circuit = new CircuitBreaker(options);
        circuit.timeout = timeout;
        circuit.limit = limit;
        assert.deepEqual(circuit.meta, options.meta);
        assert(circuit.isClosed());
    });

    it ('should close when succ more than limit', async () => {
        circuit.succ();
        assert(circuit.isClosed());
        circuit.state = states.HalfOpened;
        circuit.succ();
        assert(circuit.isHalfOpened());
        circuit.succ();
        assert(circuit.isClosed());
    });

    it ('should open when failed more than limit', async () => {
        circuit.failed();
        assert(circuit.isClosed());
        circuit.failed();
        circuit.failed();
        assert(circuit.isOpened());

        await new Promise((resolve) => {
            setTimeout(() => {
                assert(circuit.isHalfOpened());
                resolve();
            }, 1.5*timeout);
        });
    });
    
    it ('should return group', async () => {
        let h = new CircuitBreaker(options),
            o = new CircuitBreaker({}),
            c = new CircuitBreaker();

        h.state = states.HalfOpened;
        o.state = states.Opend;

        assert.deepEqual(CircuitBreaker.group([h, o ,c]), {
            halfOpened: [h],
            closed: [c],
            opened: [o]            
        });
    });
});
