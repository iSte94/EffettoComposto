import { describe, it, expect } from 'vitest';
import { parseBankCSV } from './bank-csv';

describe('parseBankCSV', () => {
    it('parses semicolon-delimited Italian CSV', () => {
        const csv = `Data;Descrizione;Importo;Saldo
15/01/2024;Stipendio Gennaio;2500,00;5000,00
20/01/2024;Supermercato Esselunga;-85,50;4914,50
25/01/2024;Bolletta Enel;-120,00;4794,50`;

        const result = parseBankCSV(csv);
        expect(result.transactions).toHaveLength(3);
        expect(result.transactions[0].amount).toBe(2500);
        expect(result.transactions[1].amount).toBe(-85.5);
        expect(result.transactions[2].amount).toBe(-120);
        expect(result.currentBalance).toBe(4794.5);
    });

    it('detects categories correctly', () => {
        const csv = `Data;Descrizione;Importo
01/02/2024;Stipendio Febbraio;3000,00
05/02/2024;Supermercato Conad;-50,00
10/02/2024;Rata Mutuo;-800,00
15/02/2024;Amazon Shopping;-25,00`;

        const result = parseBankCSV(csv);
        expect(result.transactions[0].category).toBe('Stipendio');
        expect(result.transactions[1].category).toBe('Spesa');
        expect(result.transactions[2].category).toBe('Mutuo/Prestito');
        expect(result.transactions[3].category).toBe('Shopping Online');
    });

    it('calculates totals correctly', () => {
        const csv = `Data;Descrizione;Importo
01/03/2024;Entrata;1000,00
15/03/2024;Uscita;-300,00
20/03/2024;Altra Uscita;-200,00`;

        const result = parseBankCSV(csv);
        expect(result.totalIncome).toBe(1000);
        expect(result.totalExpenses).toBe(500);
    });

    it('generates monthly summary', () => {
        const csv = `Data;Descrizione;Importo
01/01/2024;Stipendio;2000,00
15/01/2024;Affitto;-800,00
01/02/2024;Stipendio;2000,00
15/02/2024;Affitto;-800,00`;

        const result = parseBankCSV(csv);
        expect(result.monthlySummary).toHaveLength(2);
        expect(result.monthlySummary[0].month).toBe('2024-01');
        expect(result.monthlySummary[0].income).toBe(2000);
        expect(result.monthlySummary[0].expenses).toBe(800);
        expect(result.monthlySummary[0].net).toBe(1200);
    });

    it('handles comma-delimited CSV', () => {
        const csv = `Date,Description,Amount
2024-01-15,Salary,2500.00
2024-01-20,Groceries,-85.50`;

        const result = parseBankCSV(csv);
        expect(result.transactions).toHaveLength(2);
        expect(result.detectedBank).toBe('Generico EN');
    });

    it('handles separate debit/credit columns', () => {
        const csv = `Data;Causale;Dare;Avere
15/01/2024;Stipendio;;2500,00
20/01/2024;Spesa;85,50;`;

        const result = parseBankCSV(csv);
        expect(result.transactions).toHaveLength(2);
        expect(result.transactions[0].amount).toBe(2500);
        expect(result.transactions[1].amount).toBe(-85.5);
    });

    it('returns empty result for invalid input', () => {
        const result = parseBankCSV('not a csv');
        expect(result.transactions).toHaveLength(0);
    });

    it('handles Italian number format with thousand separators', () => {
        const csv = `Data;Descrizione;Importo;Saldo
15/01/2024;Investimento;-1.500,00;98.500,00`;

        const result = parseBankCSV(csv);
        expect(result.transactions[0].amount).toBe(-1500);
        expect(result.transactions[0].balance).toBe(98500);
    });

    it('parses DD/MM/YY date format', () => {
        const csv = `Data;Descrizione;Importo
15/01/24;Test;100,00`;

        const result = parseBankCSV(csv);
        expect(result.transactions[0].date).toBe('2024-01-15');
    });
});
