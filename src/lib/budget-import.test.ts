import { describe, expect, it } from "vitest";
import {
    detectBudgetMovementType,
    enrichBudgetImportDraft,
    findPotentialDuplicateMatches,
    normalizeMerchantName,
    summarizeBudgetImportBatch,
    type BudgetImportTransactionDraft,
} from "@/lib/budget-import";

describe("budget-import helpers", () => {
    it("normalizes merchant names removing payment noise", () => {
        expect(normalizeMerchantName("PAGAMENTO POS ESSELUNGA MILANO 1234")).toBe("esselunga milano");
    });

    it("detects transfers and refunds from descriptions", () => {
        expect(detectBudgetMovementType("Bonifico istantaneo a Revolut", -50).movementType).toBe("transfer");
        expect(detectBudgetMovementType("Rimborso Amazon", 19.99).movementType).toBe("refund");
    });

    it("enriches a draft with ignore rules and duplicate warnings", () => {
        const enriched = enrichBudgetImportDraft({
            transaction: {
                date: "2026-04-18",
                description: "Pagamento carta Revolut",
                amount: -42.5,
                category: "",
                confidence: "low",
            },
            customCategories: [],
            merchantRules: [{
                normalizedMerchant: "revolut",
                displayName: "Revolut",
                mode: "ignore",
                category: null,
                alias: null,
            }],
            existing: [{
                id: "tx-1",
                date: "2026-04-17",
                description: "Pagamento carta Revolut",
                amount: -42.5,
                category: "Trasferimenti",
                merchantNormalized: "revolut",
            }],
        });

        expect(enriched.shouldIgnore).toBe(true);
        expect(enriched.category).toBe("Trasferimenti");
        expect(enriched.duplicateMatches).toHaveLength(1);
        expect(enriched.warnings?.some((warning) => warning.includes("Confidenza bassa"))).toBe(true);
    });

    it("finds fuzzy duplicates on close dates and same amount", () => {
        const matches = findPotentialDuplicateMatches({
            transaction: {
                date: "2026-04-20",
                description: "Esselunga Milano",
                amount: -80,
                category: "Spesa",
                merchantNormalized: "esselunga milano",
            },
            existing: [{
                id: "dup-1",
                date: "2026-04-18",
                description: "Supermercato Esselunga Milano",
                amount: -80,
                category: "Spesa",
                merchantNormalized: "esselunga milano",
            }],
        });

        expect(matches).toHaveLength(1);
        expect(matches?.[0]?.id).toBe("dup-1");
    });

    it("summarizes ambiguous, duplicate and ignored rows", () => {
        const transactions: BudgetImportTransactionDraft[] = [
            {
                date: "2026-04-18",
                description: "Esselunga",
                amount: -54.2,
                category: "Spesa",
                confidence: "low",
                duplicateMatches: [{
                    id: "dup-1",
                    date: "2026-04-17",
                    description: "Esselunga",
                    amount: -54.2,
                    category: "Spesa",
                }],
            },
            {
                date: "2026-04-18",
                description: "Trasferimento Revolut",
                amount: -100,
                category: "Trasferimenti",
                shouldIgnore: true,
            },
            {
                date: "2026-04-18",
                description: "Stipendio",
                amount: 2500,
                category: "Stipendio",
                confidence: "high",
            },
        ];

        const summary = summarizeBudgetImportBatch(transactions);
        expect(summary.totalExpenses).toBe(154.2);
        expect(summary.totalIncome).toBe(2500);
        expect(summary.ambiguousCount).toBe(1);
        expect(summary.duplicateCount).toBe(1);
        expect(summary.ignoredCount).toBe(1);
    });
});
