import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('allows first request', () => {
        const result = checkRateLimit('test-key-1');
        expect(result.allowed).toBe(true);
    });

    it('allows up to 5 requests', () => {
        for (let i = 0; i < 5; i++) {
            const result = checkRateLimit('test-key-2');
            expect(result.allowed).toBe(true);
        }
    });

    it('blocks the 6th request', () => {
        for (let i = 0; i < 5; i++) {
            checkRateLimit('test-key-3');
        }
        const result = checkRateLimit('test-key-3');
        expect(result.allowed).toBe(false);
        expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('resets after 15 minutes', () => {
        for (let i = 0; i < 5; i++) {
            checkRateLimit('test-key-4');
        }
        expect(checkRateLimit('test-key-4').allowed).toBe(false);

        // Advance 15 minutes + 1ms
        vi.advanceTimersByTime(15 * 60 * 1000 + 1);

        const result = checkRateLimit('test-key-4');
        expect(result.allowed).toBe(true);
    });

    it('tracks different keys independently', () => {
        for (let i = 0; i < 5; i++) {
            checkRateLimit('key-a');
        }
        expect(checkRateLimit('key-a').allowed).toBe(false);
        expect(checkRateLimit('key-b').allowed).toBe(true);
    });
});
