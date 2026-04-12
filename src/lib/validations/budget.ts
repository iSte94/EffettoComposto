import { z } from 'zod';

export const budgetCategorySchema = z.object({
    id: z.string().min(1).max(64),
    name: z.string().min(1).max(60),
    limit: z.number().min(0).max(1_000_000),
    color: z.string().max(32).optional(),
    icon: z.string().max(32).optional(),
    keywords: z.array(z.string().max(60)).max(40).default([]),
});

export const budgetCategoriesSchema = z.object({
    categories: z.array(budgetCategorySchema).max(50),
});

export const budgetTransactionInputSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().max(500),
    amount: z.number(),
    category: z.string().max(60),
    hash: z.string().min(8).max(128),
});

export const budgetTransactionsImportSchema = z.object({
    transactions: z.array(budgetTransactionInputSchema).max(5000),
});

export const budgetTransactionPatchSchema = z.object({
    category: z.string().min(1).max(60),
});

export const budgetTransactionsDeleteSchema = z.object({
    month: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.literal("all")]),
});

export const budgetReapplySchema = z.object({
    mapping: z.array(z.object({
        id: z.string(),
        category: z.string().max(60),
    })).max(5000),
});
