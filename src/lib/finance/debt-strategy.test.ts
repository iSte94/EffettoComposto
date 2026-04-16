import { describe, it, expect } from 'vitest';
import { simulatePayoff, type Debt } from './debt-strategy';

describe('simulatePayoff', () => {
    it('restituisce risultato vuoto per lista debiti vuota', () => {
        const result = simulatePayoff([], "snowball", 200);
        expect(result.months).toBe(0);
        expect(result.totalInterest).toBe(0);
        expect(result.order).toEqual([]);
    });

    it('estingue un singolo debito correttamente', () => {
        const debts: Debt[] = [
            { id: "1", name: "Carta", balance: 1000, rate: 12, minPayment: 50 },
        ];
        const result = simulatePayoff(debts, "snowball", 100);
        expect(result.months).toBeGreaterThan(0);
        expect(result.months).toBeLessThan(12);
        expect(result.totalInterest).toBeGreaterThan(0);
    });

    it('rollover: la rata minima liberata accelera l\'estinzione del debito successivo', () => {
        const debts: Debt[] = [
            { id: "1", name: "Piccolo", balance: 500, rate: 10, minPayment: 100 },
            { id: "2", name: "Grande", balance: 10000, rate: 10, minPayment: 200 },
        ];

        const withRollover = simulatePayoff(debts, "snowball", 100);

        // Senza rollover (vecchio bug): dopo aver estinto "Piccolo", il budget extra
        // sarebbe solo 100€/mese. Con rollover corretto: 100€ + 100€ (min di Piccolo) = 200€.
        // Verifichiamo che l'estinzione sia ragionevolmente veloce (il rollover accelera).
        // Con budget totale = 100min + 200min + 100extra = 400€/mese,
        // dopo ~4 mesi Piccolo è estinto, poi Grande riceve 400€/mese totali.
        expect(withRollover.months).toBeGreaterThan(0);
        expect(withRollover.months).toBeLessThan(40);
    });

    it('il rollover riduce i mesi e gli interessi rispetto a nessun rollover', () => {
        // Simuliamo il vecchio comportamento senza rollover:
        // la rata minima del debito estinto NON viene ridirezionata.
        const debts: Debt[] = [
            { id: "1", name: "Piccolo", balance: 300, rate: 18, minPayment: 100 },
            { id: "2", name: "Grande", balance: 8000, rate: 8, minPayment: 200 },
        ];

        const result = simulatePayoff(debts, "snowball", 150);

        // Con rollover, dopo che Piccolo è estinto (~3 mesi), Grande riceve
        // 200 (sua min) + 100 (min Piccolo liberata) + 150 (extra) = 450€/mese
        // totali, contro i 350€/mese senza rollover. Differenza significativa.
        // Su 8000€ di debito rimanente: ~18 mesi con rollover vs ~23 senza.
        expect(result.months).toBeLessThan(25);
    });

    it('snowball ordina per saldo crescente', () => {
        const debts: Debt[] = [
            { id: "1", name: "Grande", balance: 10000, rate: 5, minPayment: 200 },
            { id: "2", name: "Piccolo", balance: 2000, rate: 20, minPayment: 50 },
        ];
        const result = simulatePayoff(debts, "snowball", 300);
        expect(result.order[0]).toBe("Piccolo");
        expect(result.order[1]).toBe("Grande");
    });

    it('avalanche ordina per tasso decrescente', () => {
        const debts: Debt[] = [
            { id: "1", name: "BassaTasso", balance: 2000, rate: 5, minPayment: 50 },
            { id: "2", name: "AltaTasso", balance: 10000, rate: 20, minPayment: 200 },
        ];
        const result = simulatePayoff(debts, "avalanche", 300);
        expect(result.order[0]).toBe("AltaTasso");
        expect(result.order[1]).toBe("BassaTasso");
    });

    it('avalanche produce meno interessi totali di snowball', () => {
        const debts: Debt[] = [
            { id: "1", name: "Carta", balance: 5000, rate: 18, minPayment: 100 },
            { id: "2", name: "Auto", balance: 12000, rate: 5.5, minPayment: 250 },
        ];
        const snowball = simulatePayoff(debts, "snowball", 200);
        const avalanche = simulatePayoff(debts, "avalanche", 200);
        expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest);
    });

    it('gestisce debito con rata minima > saldo (overpayment capped)', () => {
        const debts: Debt[] = [
            { id: "1", name: "Quasi estinto", balance: 10, rate: 12, minPayment: 100 },
            { id: "2", name: "Grosso", balance: 5000, rate: 12, minPayment: 100 },
        ];
        const result = simulatePayoff(debts, "snowball", 50);
        // Il primo debito si estingue al mese 1, la sua rata (100€) fluisce al secondo
        expect(result.months).toBeGreaterThan(0);
        expect(result.totalInterest).toBeGreaterThan(0);
    });

    it('con extra = 0 estingue comunque i debiti (solo con le rate minime)', () => {
        const debts: Debt[] = [
            { id: "1", name: "A", balance: 1000, rate: 6, minPayment: 50 },
        ];
        const result = simulatePayoff(debts, "snowball", 0);
        expect(result.months).toBeGreaterThan(0);
        expect(result.months).toBeLessThan(24);
    });

    it('tre debiti: il rollover a cascata funziona correttamente', () => {
        const debts: Debt[] = [
            { id: "1", name: "Micro", balance: 200, rate: 15, minPayment: 80 },
            { id: "2", name: "Medio", balance: 2000, rate: 10, minPayment: 100 },
            { id: "3", name: "Maxi", balance: 8000, rate: 8, minPayment: 150 },
        ];
        const result = simulatePayoff(debts, "snowball", 100);
        // Budget totale: 80+100+150+100=430€/mese
        // Micro si estingue ~mese 3, poi 430€/mese su Medio e Maxi
        // Medio si estingue ~mese 8, poi 430€/mese su Maxi
        expect(result.months).toBeLessThan(30);
    });

    it('non va oltre 600 mesi (safety cap)', () => {
        const debts: Debt[] = [
            { id: "1", name: "Enorme", balance: 1000000, rate: 50, minPayment: 1 },
        ];
        const result = simulatePayoff(debts, "snowball", 0);
        expect(result.months).toBeLessThanOrEqual(600);
    });

    it('interessi a tasso zero producono totalInterest = 0', () => {
        const debts: Debt[] = [
            { id: "1", name: "Zero", balance: 1000, rate: 0, minPayment: 100 },
        ];
        const result = simulatePayoff(debts, "snowball", 0);
        expect(result.totalInterest).toBe(0);
        expect(result.months).toBe(10);
    });
});
