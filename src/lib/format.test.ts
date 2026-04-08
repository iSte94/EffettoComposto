import { describe, it, expect } from 'vitest';
import { formatEuro, formatPercent } from './format';

describe('formatEuro', () => {
    it('formats zero', () => {
        const result = formatEuro(0);
        expect(result).toContain('0');
        expect(result).toContain('\u20AC');
    });

    it('formats positive integers', () => {
        const result = formatEuro(1500);
        expect(result).toContain('\u20AC');
        // Italian formatting uses dots as thousand separator
        expect(result).toMatch(/1[.]?500/);
    });

    it('formats large numbers with thousand separators', () => {
        const result = formatEuro(1234567);
        expect(result).toContain('\u20AC');
    });

    it('rounds to zero decimal places', () => {
        const result = formatEuro(1234.789);
        // Should not contain decimal digits
        expect(result).toMatch(/1[.]?235/);
    });

    it('handles negative numbers', () => {
        const result = formatEuro(-5000);
        expect(result).toContain('5');
    });
});

describe('formatPercent', () => {
    it('formats with default 1 decimal', () => {
        expect(formatPercent(12.345)).toBe('12.3%');
    });

    it('formats with custom decimals', () => {
        expect(formatPercent(12.345, 2)).toBe('12.35%');
        expect(formatPercent(12.345, 0)).toBe('12%');
    });

    it('formats zero', () => {
        expect(formatPercent(0)).toBe('0.0%');
    });

    it('formats 100%', () => {
        expect(formatPercent(100)).toBe('100.0%');
    });

    it('handles negative percentages', () => {
        expect(formatPercent(-5.5)).toBe('-5.5%');
    });
});
