import { describe, it, expect } from 'vitest';
import {
    calculatePropertyAnnualCosts,
    calculatePropertyAnnualNetIncome,
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

    it('non permette rendita netta negativa (floor a 0)', () => {
        const net = calculatePropertyAnnualNetIncome({
            rent: 1000,
            costs: 3000,
            imu: 500,
            isRented: true,
        });
        expect(net).toBe(0);
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
});
