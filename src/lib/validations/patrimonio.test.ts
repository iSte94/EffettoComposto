import { describe, it, expect } from 'vitest';
import { assetRecordSchema, deleteRecordSchema } from './patrimonio';

describe('assetRecordSchema', () => {
    it('accepts valid asset record', () => {
        const result = assetRecordSchema.safeParse({
            realEstateValue: 200000,
            liquidStockValue: 50000,
            emergencyFund: 10000,
            bitcoinAmount: 0.5,
            bitcoinPrice: 40000,
            debtsTotal: 100000,
        });
        expect(result.success).toBe(true);
    });

    it('accepts empty object (all optional)', () => {
        expect(assetRecordSchema.safeParse({}).success).toBe(true);
    });

    it('rejects negative values', () => {
        expect(assetRecordSchema.safeParse({ realEstateValue: -1 }).success).toBe(false);
        expect(assetRecordSchema.safeParse({ liquidStockValue: -100 }).success).toBe(false);
        expect(assetRecordSchema.safeParse({ debtsTotal: -50 }).success).toBe(false);
    });

    it('accepts zero values', () => {
        const result = assetRecordSchema.safeParse({
            realEstateValue: 0,
            liquidStockValue: 0,
            debtsTotal: 0,
        });
        expect(result.success).toBe(true);
    });

    it('accepts string fields for JSON lists', () => {
        const result = assetRecordSchema.safeParse({
            realEstateList: '[{"name":"Casa"}]',
            customStocksList: '[]',
        });
        expect(result.success).toBe(true);
    });
});

describe('deleteRecordSchema', () => {
    it('accepts valid id', () => {
        expect(deleteRecordSchema.safeParse({ id: 'abc-123' }).success).toBe(true);
    });

    it('rejects empty id', () => {
        expect(deleteRecordSchema.safeParse({ id: '' }).success).toBe(false);
    });

    it('rejects missing id', () => {
        expect(deleteRecordSchema.safeParse({}).success).toBe(false);
    });
});
