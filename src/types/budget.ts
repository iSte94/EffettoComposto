export interface BudgetCategory {
    id: string;
    name: string;
    limit: number;
    color?: string;
    icon?: string;
    keywords: string[];
}

export interface BudgetTransaction {
    id: string;
    date: string;         // YYYY-MM-DD
    description: string;
    amount: number;       // <0 uscita, >0 entrata
    category: string;
    categoryOverride?: boolean;
    hash: string;
    merchantNormalized?: string | null;
    movementType?: string;
    importConfidence?: string | null;
    importBatchId?: string | null;
}

export type BudgetViewMode = "month" | "avg" | "all";

export interface BudgetSettings {
    currentMonth?: string; // YYYY-MM
    viewMode?: BudgetViewMode;
}

export const FALLBACK_CATEGORY_NAME = "Altro";
