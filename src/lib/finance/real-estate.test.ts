import { describe, it, expect } from 'vitest';
import {
    calculatePropertyAnnualCosts,
    calculatePropertyAnnualNetIncome,
    buildRealEstatePassiveIncomeStreams,
    sumRealEstateAnnualNetIncome,
} from './real-estate';

describe('calculatePropertyAnnualCosts', () => {
    it('somma costi e IMU per immobile non primario (no double-count)', () => {
        // Regression: in fire-dashboard.tsx una copia duplicata aggiungeva
        // IMU sia come /12 sia come valore pieno, arrivando a imu * 13/12.
        const result = calculatePropertyAnnualCosts({
            costs: 2000,
            imu: 1200,
            isPrimaryResidence: false,
        });
        expect(result).toBe(3200); // NON 3300 (bug vecchio: 2000 + 100 + 1200)
    });

    it('esclude IMU per prima casa', () => {
        expect(calculatePropertyAnnualCosts({
            costs: 2000,
            imu: 1200,
            isPrimaryResidence: true,
        })).toBe(2000);
    });

    it('gestisce campi undefined/mancanti', () => {
        expect(calculatePropertyAnnualCosts({})).toBe(0);
        expect(calculatePropertyAnnualCosts({ costs: 500 })).toBe(500);
        expect(calculatePropertyAnnualCosts({ imu: 800 })).toBe(800);
    });

    it('tratta valori negativi come zero (input sanitization)', () => {
        expect(calculatePropertyAnnualCosts({ costs: -100, imu: -50 })).toBe(0);
    });
});

describe('calculatePropertyAnnualNetIncome', () => {
    it('ritorna 0 se immobile non affittato', () => {
        expect(calculatePropertyAnnualNetIncome({
            rent: 12000,
            costs: 2000,
            imu: 1000,
            isRented: false,
        })).toBe(0);
    });

    it('calcola rendita netta annua per immobile affittato', () => {
        // 12000 rent - (2000 costs + 1000 IMU) = 9000
        const net = calculatePropertyAnnualNetIncome({
            rent: 12000,
            costs: 2000,
            imu: 1000,
            isRented: true,
            isPrimaryResidence: false,
        });
        expect(net).toBe(9000);
    });

    it('non sottrae IMU per prima casa affittata (caso raro)', () => {
        const net = calculatePropertyAnnualNetIncome({
            rent: 6000,
            costs: 1000,
            imu: 800,
            isRented: true,
            isPrimaryResidence: true,
        });
        expect(net).toBe(5000);
    });

    it('riporta rendita netta negativa per immobili in perdita', () => {
        // Un immobile con costi > affitto DEVE contribuire negativamente
        // al reddito passivo totale, altrimenti il target FIRE viene sottostimato.
        const net = calculatePropertyAnnualNetIncome({
            rent: 1000,
            costs: 3000,
            imu: 500,
            isRented: true,
        });
        expect(net).toBe(1000 - 3000 - 500); // -2500
    });

    it('considera rentStartDate futura: 0 prima della maturazione', () => {
        const net = calculatePropertyAnnualNetIncome({
            rent: 12000,
            costs: 2000,
            imu: 1000,
            isRented: false,
            rentStartDate: '2030-06',
        }, '2028-01');
        expect(net).toBe(0);
    });

    it('considera rentStartDate maturata: attiva la rendita', () => {
        const net = calculatePropertyAnnualNetIncome({
            rent: 12000,
            costs: 2000,
            imu: 1000,
            isRented: false,
            rentStartDate: '2028-06',
        }, '2029-01');
        expect(net).toBe(9000);
    });
});

describe('sumRealEstateAnnualNetIncome', () => {
    it('aggrega correttamente piu immobili', () => {
        const total = sumRealEstateAnnualNetIncome([
            { rent: 12000, costs: 2000, imu: 1000, isRented: true },                  // 9000
            { rent: 6000, costs: 1200, imu: 800, isRented: true, isPrimaryResidence: true },  // 4800 (IMU esclusa)
            { rent: 10000, costs: 500, imu: 500, isRented: false },                    // 0 (non affittato)
        ]);
        expect(total).toBe(9000 + 4800 + 0);
    });

    it('gestisce lista vuota', () => {
        expect(sumRealEstateAnnualNetIncome([])).toBe(0);
    });

    it('immobile in perdita riduce il reddito passivo totale', () => {
        // Scenario reale: un immobile redditizio + uno in perdita.
        // PRIMA del fix: +9000 + 0 = 9000 (floor a 0 nascondeva la perdita)
        // DOPO il fix:   +9000 + (-2500) = 6500 (corretto)
        // Impatto sul FIRE target (SWR 4%, spese 30k/anno):
        //   PRIMA: (30000 - 9000) / 0.04 = 525.000€
        //   DOPO:  (30000 - 6500) / 0.04 = 587.500€  (+62.500€ di differenza!)
        const total = sumRealEstateAnnualNetIncome([
            { rent: 12000, costs: 2000, imu: 1000, isRented: true },           // +9000
            { rent: 1000, costs: 3000, imu: 500, isRented: true },             // -2500
        ]);
        expect(total).toBe(9000 + (-2500));
    });
});

describe('buildRealEstatePassiveIncomeStreams', () => {
    it('fa partire lo stream dal retirement se la rendita matura prima', () => {
        const streams = buildRealEstatePassiveIncomeStreams([
            {
                rent: 12000,
                costs: 2000,
                imu: 1000,
                isRented: false,
                rentStartDate: '2032-01',
            },
        ], {
            currentAge: 40,
            retirementAge: 60,
            asOfYearMonth: '2030-01',
        });

        expect(streams).toHaveLength(1);
        expect(streams[0].annualAmount).toBe(9000);
        expect(streams[0].startAge).toBe(60);
    });

    it('non usa mai il valore dell immobile e ignora proprieta senza rendita pianificata', () => {
        const streams = buildRealEstatePassiveIncomeStreams([
            {
                rent: 0,
                costs: 1500,
                imu: 800,
                isRented: false,
            },
            {
                rent: 8000,
                costs: 1000,
                imu: 0,
                isRented: true,
            },
        ], {
            currentAge: 35,
            retirementAge: 55,
            asOfYearMonth: '2026-04',
        });

        expect(streams).toHaveLength(1);
        expect(streams[0].annualAmount).toBe(7000);
        expect(streams[0].startAge).toBe(55);
    });

    it('posticipa lo stream oltre il retirement se la rendita parte piu tardi', () => {
        const streams = buildRealEstatePassiveIncomeStreams([
            {
                rent: 10000,
                costs: 1000,
                imu: 500,
                isRented: false,
                rentStartDate: '2056-04',
            },
        ], {
            currentAge: 50,
            retirementAge: 55,
            asOfYearMonth: '2049-04',
        });

        expect(streams).toHaveLength(1);
        expect(streams[0].annualAmount).toBe(8500);
        expect(streams[0].startAge).toBe(57);
    });
});
