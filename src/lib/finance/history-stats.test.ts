import { describe, it, expect } from 'vitest';
import { computeHistoryStats, type HistoryPoint } from './history-stats';

const DAY = 1000 * 60 * 60 * 24;

function makeHistory(points: Array<{ daysAgo: number; value: number }>): HistoryPoint[] {
    const now = new Date('2026-01-01T00:00:00Z').getTime();
    return points
        .map(p => ({ date: new Date(now - p.daysAgo * DAY).toISOString(), value: p.value }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

describe('computeHistoryStats', () => {
    it('returns nulls on empty history', () => {
        const stats = computeHistoryStats([]);
        expect(stats.cagrPercent).toBeNull();
        expect(stats.cagrYears).toBeNull();
        expect(stats.maxDrawdownPercent).toBeNull();
        expect(stats.peakValue).toBeNull();
        expect(stats.currentDrawdownPercent).toBeNull();
        expect(stats.isAtAllTimeHigh).toBe(false);
    });

    it('returns null CAGR with a single point but still reports peak', () => {
        const stats = computeHistoryStats(makeHistory([{ daysAgo: 0, value: 10000 }]));
        expect(stats.cagrPercent).toBeNull();
        expect(stats.cagrYears).toBeNull();
        expect(stats.maxDrawdownPercent).toBe(0);
        expect(stats.peakValue).toBe(10000);
        expect(stats.currentDrawdownPercent).toBe(0);
        expect(stats.isAtAllTimeHigh).toBe(true);
    });

    it('computes CAGR correctly on a 1 year doubling', () => {
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: Math.round(365.25), value: 1000 },
            { daysAgo: 0, value: 2000 },
        ]));
        expect(stats.cagrYears).toBeCloseTo(1, 1);
        expect(stats.cagrPercent).toBeCloseTo(100, 0);
    });

    it('computes CAGR correctly on a 2 year 21% total growth (~10% annualized)', () => {
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: Math.round(365.25 * 2), value: 10000 },
            { daysAgo: 0, value: 12100 },
        ]));
        expect(stats.cagrYears).toBeCloseTo(2, 1);
        expect(stats.cagrPercent).toBeCloseTo(10, 0);
    });

    it('returns null CAGR if period is shorter than ~3 months', () => {
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: 30, value: 10000 },
            { daysAgo: 0, value: 11000 },
        ]));
        expect(stats.cagrPercent).toBeNull();
        expect(stats.cagrYears).toBeNull();
    });

    it('returns null CAGR when first value is non-positive', () => {
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: 400, value: 0 },
            { daysAgo: 0, value: 20000 },
        ]));
        expect(stats.cagrPercent).toBeNull();
    });

    it('returns null CAGR when last value is non-positive (indebted)', () => {
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: 400, value: 5000 },
            { daysAgo: 0, value: -1000 },
        ]));
        expect(stats.cagrPercent).toBeNull();
    });

    it('computes max drawdown from a peak to a trough', () => {
        // 100 -> 120 (peak) -> 90 -> 110; max drawdown = (90 - 120)/120 = -25%
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: 400, value: 100 },
            { daysAgo: 300, value: 120 },
            { daysAgo: 200, value: 90 },
            { daysAgo: 0, value: 110 },
        ]));
        expect(stats.peakValue).toBe(120);
        expect(stats.maxDrawdownPercent).toBeCloseTo(-25, 5);
    });

    it('reports drawdown of 0 on a strictly monotonic uptrend', () => {
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: 400, value: 100 },
            { daysAgo: 200, value: 110 },
            { daysAgo: 0, value: 130 },
        ]));
        expect(stats.maxDrawdownPercent).toBe(0);
        expect(stats.peakValue).toBe(130);
    });

    it('uses earliest peak, not final value, to compute drawdown', () => {
        // Series: 200 (peak) -> 100 -> 150. Drawdown = (100 - 200)/200 = -50%
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: 400, value: 200 },
            { daysAgo: 200, value: 100 },
            { daysAgo: 0, value: 150 },
        ]));
        expect(stats.maxDrawdownPercent).toBeCloseTo(-50, 5);
        expect(stats.peakValue).toBe(200);
    });

    it('reports current drawdown as 0 and ATH flag when last value equals peak', () => {
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: 400, value: 100 },
            { daysAgo: 200, value: 120 },
            { daysAgo: 0, value: 130 },
        ]));
        expect(stats.peakValue).toBe(130);
        expect(stats.currentDrawdownPercent).toBe(0);
        expect(stats.isAtAllTimeHigh).toBe(true);
    });

    it('reports negative current drawdown when below peak', () => {
        // Peak at 200, current at 150 -> -25%
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: 400, value: 100 },
            { daysAgo: 200, value: 200 },
            { daysAgo: 0, value: 150 },
        ]));
        expect(stats.peakValue).toBe(200);
        expect(stats.currentDrawdownPercent).toBeCloseTo(-25, 5);
        expect(stats.isAtAllTimeHigh).toBe(false);
    });

    it('current drawdown differs from max drawdown after a partial recovery', () => {
        // 100 -> 200 (peak) -> 100 (trough, max drawdown -50%) -> 180 (current, ~-10%)
        const stats = computeHistoryStats(makeHistory([
            { daysAgo: 400, value: 100 },
            { daysAgo: 300, value: 200 },
            { daysAgo: 100, value: 100 },
            { daysAgo: 0, value: 180 },
        ]));
        expect(stats.maxDrawdownPercent).toBeCloseTo(-50, 5);
        expect(stats.currentDrawdownPercent).toBeCloseTo(-10, 5);
        expect(stats.isAtAllTimeHigh).toBe(false);
    });
});
