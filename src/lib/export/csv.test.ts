// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportPatrimonioCSV, exportAmortizationCSV } from './csv';

let capturedBlobs: Blob[] = [];
let clickSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
    capturedBlobs = [];
    clickSpy = vi.fn();

    // jsdom provides Blob but not URL.createObjectURL
    window.URL.createObjectURL = vi.fn((blob: Blob) => {
        capturedBlobs.push(blob);
        return 'blob:mock-url';
    });
    window.URL.revokeObjectURL = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
            return { href: '', download: '', click: clickSpy } as unknown as HTMLElement;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
    });
});

async function getCsvContent(): Promise<string> {
    const blob = capturedBlobs[0];
    return blob.text();
}

describe('exportPatrimonioCSV', () => {
    it('generates CSV with correct headers and triggers download', async () => {
        const history = [
            {
                date: '2024-01-15T00:00:00.000Z',
                realEstateValue: 200000,
                liquidStockValue: 50000,
                safeHavens: 10000,
                emergencyFund: 5000,
                pensionFund: 3000,
                bitcoinAmount: 0.5,
                bitcoinPrice: 40000,
                debtsTotal: 100000,
            },
        ];

        exportPatrimonioCSV(history);

        expect(capturedBlobs).toHaveLength(1);
        const csv = await getCsvContent();

        // Check headers
        expect(csv).toContain('Data;Immobili;Liquidita CC;Azioni/ETF;Beni Rifugio');

        // Check data
        expect(csv).toContain('2024-01-15');
        expect(csv).toContain('200000');

        // Net worth (esclusi immobili): 50000+0+10000+5000+3000+(0.5*40000)-100000 = -12000
        expect(csv).toContain('-12000');

        // Download triggered
        expect(clickSpy).toHaveBeenCalled();
        expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('handles empty history', async () => {
        exportPatrimonioCSV([]);
        const csv = await getCsvContent();
        const lines = csv.replace('\uFEFF', '').split('\n');
        expect(lines).toHaveLength(1); // Just headers
    });
});

describe('exportAmortizationCSV', () => {
    it('generates correct amortization schedule', async () => {
        exportAmortizationCSV({ loanAmount: 100000, rate: 5, years: 1 });

        const csv = await getCsvContent();
        expect(csv).toContain('Mese;Rata;Quota Capitale;Quota Interessi;Debito Residuo');

        const lines = csv.replace('\uFEFF', '').split('\n');
        expect(lines).toHaveLength(13); // 1 header + 12 months

        // Last row: remaining debt ~0
        const lastRow = lines[12].split(';');
        expect(parseFloat(lastRow[4])).toBeCloseTo(0, 0);
    });

    it('handles zero loan amount', async () => {
        exportAmortizationCSV({ loanAmount: 0, rate: 5, years: 1 });
        const csv = await getCsvContent();
        const lines = csv.replace('\uFEFF', '').split('\n');
        expect(lines).toHaveLength(13);
    });

    it('total principal repaid equals loan amount', async () => {
        exportAmortizationCSV({ loanAmount: 50000, rate: 3, years: 5 });

        const csv = await getCsvContent();
        const lines = csv.replace('\uFEFF', '').split('\n').slice(1);

        let totalPrincipal = 0;
        for (const line of lines) {
            totalPrincipal += parseFloat(line.split(';')[2]);
        }
        expect(totalPrincipal).toBeCloseTo(50000, -1);
    });
});
