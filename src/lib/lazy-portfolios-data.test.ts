import { describe, it, expect } from 'vitest';
import { LAZY_PORTFOLIOS } from './lazy-portfolios-data';

describe('LAZY_PORTFOLIOS Data integrity', () => {
    it('all portfolios should have allocation sum of 100% or close (rounding)', () => {
        for (const p of LAZY_PORTFOLIOS) {
            const sum = p.allocation.stocks + p.allocation.bonds + p.allocation.commodities + p.allocation.cash;
            expect(sum).toBeCloseTo(100, 1);
        }
    });

    it('all portfolios should have non-empty name, description, and author', () => {
        for (const p of LAZY_PORTFOLIOS) {
            expect(p.name.length).toBeGreaterThan(0);
            expect(p.description.length).toBeGreaterThan(0);
            expect(p.author.length).toBeGreaterThan(0);
        }
    });

    it('all portfolios should have matching USD and EUR ETF weights summing to 100% respectively', () => {
        for (const p of LAZY_PORTFOLIOS) {
            const sumUsd = p.etfsUsd.reduce((acc, etf) => acc + etf.weight, 0);
            const sumEur = p.etfsEur.reduce((acc, etf) => acc + etf.weight, 0);
            expect(sumUsd).toBeCloseTo(100, 1);
            expect(sumEur).toBeCloseTo(100, 1);
        }
    });

    it('all portfolios should have valid stats for all three periods', () => {
        const periods = ['1985-2020', '2000-2020', '2010-2020'] as const;
        for (const p of LAZY_PORTFOLIOS) {
            for (const period of periods) {
                const stat = p.stats[period];
                expect(stat).toBeDefined();
                
                // USD stats
                expect(stat.usd.returnPct).toBeGreaterThan(0);
                expect(stat.usd.stdDevPct).toBeGreaterThan(0);
                expect(stat.usd.sharpeRatio).toBeGreaterThan(-1);
                expect(stat.usd.maxDrawdownPct).toBeGreaterThanOrEqual(0);

                // EUR stats
                expect(stat.eur.returnPct).toBeGreaterThan(0);
                expect(stat.eur.stdDevPct).toBeGreaterThan(0);
                expect(stat.eur.sharpeRatio).toBeGreaterThan(-1);
                expect(stat.eur.maxDrawdownPct).toBeGreaterThanOrEqual(0);

                // USD to EUR stats
                expect(stat.usdToEur.returnPct).toBeGreaterThan(0);
                expect(stat.usdToEur.stdDevPct).toBeGreaterThan(0);
                expect(stat.usdToEur.sharpeRatio).toBeGreaterThan(-1);
                expect(stat.usdToEur.maxDrawdownPct).toBeGreaterThanOrEqual(0);
            }
        }
    });
});
