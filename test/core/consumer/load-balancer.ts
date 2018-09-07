import assert from 'assert';
import LB from './../../../dist/core/consumer/load-balancer';

describe('test/core/consumer/load-balancer.ts', () => {
    let list = [1, 2, 3];

    it ('should randomLoadBalance return a member of list', async () => {
        let rlb = LB.randomLoadBalance(),
            r = rlb(list),
            unf = rlb([]);
        assert(list.indexOf(r) >= 0);
        assert(!unf);
    });

    it('should roundRoubinLoadBalance return one by one', async () => {
        let rrlb = LB.roundRobinLoadBalance();

        let ra1 = rrlb(list, 'a'),
            ra2 = rrlb(list, 'a'),
            rb1 = rrlb(list, 'b'),
            r1;

        rrlb(list, 'a');

        r1 = rrlb(list, 'a');

        assert.equal(ra1, list[0]);
        assert.equal(ra2, list[1]);
        assert.equal(rb1, list[0]);
        assert.equal(r1, list[0]);
    });
});