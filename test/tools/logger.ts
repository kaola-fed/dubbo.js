import { logger } from './../../dist/tools/logger';
import * as assert from 'assert';

describe('test/tools/logger.ts', () => {
    it('logger should has info', () => {
        assert.ok(logger.info);
    });

    it('logger should has error', () => {
        assert.ok(logger.error);
    });

    it('logger should has warn', () => {
        assert.ok(logger.warn);
    });

    it('logger should has debug', () => {
        assert.ok(logger.debug);
    });
})