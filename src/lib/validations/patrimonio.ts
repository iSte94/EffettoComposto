import { z } from 'zod';

export const assetRecordSchema = z.object({
    realEstateValue: z.number().min(0).optional(),
    realEstateCosts: z.number().min(0).optional(),
    realEstateRent: z.number().min(0).optional(),
    liquidStockValue: z.number().min(0).optional(),
    safeHavens: z.number().min(0).optional(),
    emergencyFund: z.number().min(0).optional(),
    pensionFund: z.number().min(0).optional(),
    debtsTotal: z.number().min(0).optional(),
    bitcoinAmount: z.number().min(0).optional(),
    bitcoinPrice: z.number().min(0).optional(),
    realEstateList: z.string().optional(),
    customStocksList: z.string().optional(),
});

export const deleteRecordSchema = z.object({
    id: z.string().min(1, 'ID obbligatorio'),
});
