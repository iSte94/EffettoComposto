import { describe, it, expect } from 'vitest';
import { formatEuro, formatEuroCompact, formatPercent } from './format';

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

describe('formatEuroCompact', () => {
    it('uses full formatting below 10.000', () => {
        expect(formatEuroCompact(0)).toBe('\u20AC0');
        expect(formatEuroCompact(500)).toBe('\u20AC500');
        expect(formatEuroCompact(9999)).toMatch(/9[.]?999/);
    });

    it('uses K suffix between 10.000 and 999.999', () => {
        expect(formatEuroCompact(10_000)).toBe('\u20AC10K');
        expect(formatEuroCompact(12_500)).toBe('\u20AC12.5K');
        expect(formatEuroCompact(125_000)).toBe('\u20AC125K');
        expect(formatEuroCompact(999_000)).toBe('\u20AC999K');
    });

    it('uses M suffix from 1.000.000 onward', () => {
        expect(formatEuroCompact(1_000_000)).toBe('\u20AC1M');
        expect(formatEuroCompact(1_234_567)).toBe('\u20AC1.2M');
        expect(formatEuroCompact(12_500_000)).toBe('\u20AC12.5M');
        expect(formatEuroCompact(100_000_000)).toBe('\u20AC100M');
    });

    it('preserves sign for negative values', () => {
        expect(formatEuroCompact(-500)).toBe('-\u20AC500');
        expect(formatEuroCompact(-12_500)).toBe('-\u20AC12.5K');
        expect(formatEuroCompact(-1_200_000)).toBe('-\u20AC1.2M');
    });

    it('strips trailing zero decimal', () => {
        // 10.000 -> 10K not 10.0K
        expect(formatEuroCompact(10_000)).not.toContain('.0K');
        // 1.000.000 -> 1M not 1.0M
        expect(formatEuroCompact(1_000_000)).not.toContain('.0M');
    });

    it('returns em-dash for non-finite values', () => {
        expect(formatEuroCompact(Number.NaN)).toBe('\u2014');
        expect(formatEuroCompact(Number.POSITIVE_INFINITY)).toBe('\u2014');
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
