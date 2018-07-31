import assert from 'assert';
import { randomLoadBalance, roundRoubinLoadBalance } from './../../../dist/core/consumer/load-balancer';

describe('test/core/consumer/load-balancer.ts', () => {
    let list = [1, 2, 3];

    it ('should randomLoadBalance return a member of list', async () => {
        let rlb = randomLoadBalance(),
            r = rlb(list),
            unf = rlb([]);
        assert(list.indexOf(r) >= 0);
        assert(!unf);
    });

    it('should roundRoubinLoadBalance return one by one', async () => {
        let rrlb = roundRoubinLoadBalance(list);

        let ra1 = rrlb('a'),
            ra2 = rrlb('a'),
            rb1 = rrlb('b'),
            r1;

        rrlb('a');

        r1 = rrlb('a');

        assert.equal(ra1, list[0]);
        assert.equal(ra2, list[1]);
        assert.equal(rb1, list[0]);
        assert.equal(r1, list[0]);

        rrlb = roundRoubinLoadBalance('');
        ra1 = rrlb();
        assert.equal(ra1, '');
    });
});