import { categorizeTransaction, type CategoryRule } from "@/lib/import/bank-csv";

export type BudgetImportConfidence = "high" | "medium" | "low";

export type BudgetMovementType =
    | "standard"
    | "income"
    | "refund"
    | "transfer"
    | "cash_withdrawal"
    | "subscription"
    | "card_payment"
    | "fee"
    | "unknown";

export interface BudgetMerchantRuleLite {
    normalizedMerchant: string;
    displayName: string;
    category?: string | null;
    mode: "categorize" | "ignore";
    alias?: string | null;
}

export interface BudgetImportTransactionDraft {
    date: string;
    description: string;
    amount: number;
    category: string;
    merchant?: string | null;
    merchantNormalized?: string | null;
    confidence?: BudgetImportConfidence;
    movementType?: BudgetMovementType;
    shouldIgnore?: boolean;
    notes?: string | null;
    warnings?: string[];
    duplicateMatches?: Array<{
        id: string;
        date: string;
        description: string;
        amount: number;
        category: string;
    }>;
}

export interface BudgetExistingTransactionLite {
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string;
    merchantNormalized?: string | null;
}

const STOPWORDS = new Set([
    "pagamento",
    "pagam",
    "acquisto",
    "acq",
    "carta",
    "debito",
    "credito",
    "visa",
    "mastercard",
    "mc",
    "pos",
    "trx",
    "sepa",
    "sdd",
    "bonifico",
    "ordine",
    "addebito",
    "diretto",
    "dd",
    "pagopa",
    "transaction",
    "payment",
    "contactless",
    "autorizzazione",
    "auth",
    "online",
    "store",
    "negozio",
    "shop",
    "com",
    "it",
    "eu",
    "spa",
    "srl",
    "srlss",
    "imp",
    "pag",
    "prelievo",
    "atm",
    "bancomat",
    "ricarica",
    "saldo",
]);

const SPECIAL_PATTERNS: Array<{
    movementType: BudgetMovementType;
    patterns: RegExp[];
    warning: string;
}> = [
    {
        movementType: "transfer",
        patterns: [
            /\bgiroconto\b/i,
            /\btrasferimento\b/i,
            /\bbonifico(?:\s+istantaneo)?\s+(?:a|da)\b/i,
            /\bpaypal\s*\*?\s*friends/i,
            /\brevolut\b/i,
            /\bsatispay\b/i,
            /\bpostepay\b/i,
            /\bwallet\b/i,
        ],
        warning: "Possibile trasferimento interno o movimento tra conti",
    },
    {
        movementType: "refund",
        patterns: [/\brimborso\b/i, /\bstorno\b/i, /\brefund\b/i],
        warning: "Possibile rimborso/storno",
    },
    {
        movementType: "cash_withdrawal",
        patterns: [/\bprelievo\b/i, /\batm\b/i, /\bbancomat\b/i, /\bcash withdrawal\b/i],
        warning: "Possibile prelievo contanti",
    },
    {
        movementType: "subscription",
        patterns: [/\bnetflix\b/i, /\bspotify\b/i, /\bprime\b/i, /\bdisney\b/i, /\babbon/i],
        warning: "Possibile abbonamento ricorrente",
    },
    {
        movementType: "fee",
        patterns: [/\bcommission/i, /\bcanone\b/i, /\bfee\b/i, /\bimposta di bollo\b/i],
        warning: "Possibile commissione/costo bancario",
    },
    {
        movementType: "card_payment",
        patterns: [/\bcarta\b/i, /\bvisa\b/i, /\bmastercard\b/i],
        warning: "Pagamento carta o saldo carta",
    },
];

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

export function normalizeBudgetText(value: string): string {
    return normalizeWhitespace(
        value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\p{L}\p{N}\s]/gu, " "),
    );
}

export function normalizeMerchantName(value: string): string | null {
    const normalized = normalizeBudgetText(value);
    if (!normalized) return null;

    const tokens = normalized
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
        .filter((token) => !STOPWORDS.has(token))
        .filter((token) => !/^\d+$/.test(token));

    if (tokens.length === 0) return null;

    return tokens.slice(0, 4).join(" ");
}

function tokenSet(value: string): Set<string> {
    return new Set(
        normalizeBudgetText(value)
            .split(" ")
            .filter((token) => token.length >= 3),
    );
}

function similarityScore(left: string, right: string): number {
    const a = tokenSet(left);
    const b = tokenSet(right);
    if (a.size === 0 || b.size === 0) return 0;
    let common = 0;
    for (const token of a) {
        if (b.has(token)) common += 1;
    }
    return common / Math.max(a.size, b.size);
}

function dayDistance(left: string, right: string): number {
    const leftMs = new Date(left).getTime();
    const rightMs = new Date(right).getTime();
    if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return Number.MAX_SAFE_INTEGER;
    return Math.abs(Math.round((leftMs - rightMs) / (24 * 3600 * 1000)));
}

export function detectBudgetMovementType(description: string, amount: number): {
    movementType: BudgetMovementType;
    warning: string | null;
} {
    if (amount > 0) {
        const normalized = normalizeBudgetText(description);
        if (/\brimborso\b|\bstorno\b|\brefund\b/.test(normalized)) {
            return { movementType: "refund", warning: "Entrata che sembra un rimborso" };
        }
        if (/\bstipendio\b|\bsalary\b|\bbonifico stipendio\b/.test(normalized)) {
            return { movementType: "income", warning: null };
        }
    }

    for (const entry of SPECIAL_PATTERNS) {
        if (entry.patterns.some((pattern) => pattern.test(description))) {
            return { movementType: entry.movementType, warning: entry.warning };
        }
    }

    return { movementType: amount > 0 ? "income" : "standard", warning: null };
}

export function applyBudgetMerchantRules(args: {
    description: string;
    merchantNormalized?: string | null;
    rules: BudgetMerchantRuleLite[];
}): {
    shouldIgnore: boolean;
    category: string | null;
    alias: string | null;
} {
    const normalizedMerchant = args.merchantNormalized ?? normalizeMerchantName(args.description);
    if (!normalizedMerchant) {
        return { shouldIgnore: false, category: null, alias: null };
    }

    const match = args.rules.find((rule) => rule.normalizedMerchant === normalizedMerchant);
    if (!match) {
        return { shouldIgnore: false, category: null, alias: null };
    }

    return {
        shouldIgnore: match.mode === "ignore",
        category: match.mode === "categorize" ? match.category ?? null : null,
        alias: match.alias ?? null,
    };
}

export function categorizeBudgetDescription(args: {
    description: string;
    merchantNormalized?: string | null;
    customCategories: CategoryRule[];
    merchantRules: BudgetMerchantRuleLite[];
}): {
    category: string;
    merchantNormalized: string | null;
    alias: string | null;
    shouldIgnore: boolean;
} {
    const merchantNormalized = args.merchantNormalized ?? normalizeMerchantName(args.description);
    const merchantRule = applyBudgetMerchantRules({
        description: args.description,
        merchantNormalized,
        rules: args.merchantRules,
    });

    if (merchantRule.shouldIgnore) {
        return {
            category: "Trasferimenti",
            merchantNormalized,
            alias: merchantRule.alias,
            shouldIgnore: true,
        };
    }

    if (merchantRule.category) {
        return {
            category: merchantRule.category,
            merchantNormalized,
            alias: merchantRule.alias,
            shouldIgnore: false,
        };
    }

    return {
        category: categorizeTransaction(args.description, args.customCategories),
        merchantNormalized,
        alias: null,
        shouldIgnore: false,
    };
}

export function findPotentialDuplicateMatches(args: {
    transaction: BudgetImportTransactionDraft;
    existing: BudgetExistingTransactionLite[];
}): BudgetImportTransactionDraft["duplicateMatches"] {
    const normalizedMerchant = args.transaction.merchantNormalized ?? normalizeMerchantName(args.transaction.description);

    return args.existing
        .filter((candidate) => Math.abs(Math.abs(candidate.amount) - Math.abs(args.transaction.amount)) < 0.009)
        .filter((candidate) => dayDistance(candidate.date, args.transaction.date) <= 5)
        .filter((candidate) => {
            if (normalizedMerchant && candidate.merchantNormalized && candidate.merchantNormalized === normalizedMerchant) {
                return true;
            }
            return similarityScore(candidate.description, args.transaction.description) >= 0.5;
        })
        .slice(0, 3)
        .map((candidate) => ({
            id: candidate.id,
            date: candidate.date,
            description: candidate.description,
            amount: candidate.amount,
            category: candidate.category,
        }));
}

export function enrichBudgetImportDraft(args: {
    transaction: BudgetImportTransactionDraft;
    customCategories: CategoryRule[];
    merchantRules: BudgetMerchantRuleLite[];
    existing: BudgetExistingTransactionLite[];
}): BudgetImportTransactionDraft {
    const description = normalizeWhitespace(args.transaction.description);
    const merchantNormalized = args.transaction.merchantNormalized ?? normalizeMerchantName(description);
    const movement = detectBudgetMovementType(description, args.transaction.amount);
    const categorization = categorizeBudgetDescription({
        description,
        merchantNormalized,
        customCategories: args.customCategories,
        merchantRules: args.merchantRules,
    });
    const warnings = [...(args.transaction.warnings ?? [])];

    if (movement.warning) warnings.push(movement.warning);
    if (categorization.shouldIgnore) warnings.push("Regola utente: ignora questo merchant/movimento");
    if ((args.transaction.confidence ?? "medium") === "low") warnings.push("Confidenza bassa");

    const duplicateMatches = findPotentialDuplicateMatches({
        transaction: {
            ...args.transaction,
            description,
            merchantNormalized,
            amount: args.transaction.amount,
            date: args.transaction.date,
        },
        existing: args.existing,
    });
    if (duplicateMatches && duplicateMatches.length > 0) {
        warnings.push("Possibile duplicato gia' presente");
    }

    return {
        ...args.transaction,
        description,
        category: args.transaction.category?.trim() || categorization.category,
        merchantNormalized,
        merchant: args.transaction.merchant?.trim() || categorization.alias || merchantNormalized,
        confidence: args.transaction.confidence ?? "medium",
        movementType: args.transaction.movementType ?? movement.movementType,
        shouldIgnore: args.transaction.shouldIgnore ?? categorization.shouldIgnore,
        warnings,
        duplicateMatches,
    };
}

export function summarizeBudgetImportBatch(transactions: BudgetImportTransactionDraft[]) {
    const totalsByCategory = new Map<string, number>();
    let totalIncome = 0;
    let totalExpenses = 0;
    let ambiguousCount = 0;
    let duplicateCount = 0;
    let ignoredCount = 0;

    for (const transaction of transactions) {
        if ((transaction.confidence ?? "medium") === "low") ambiguousCount += 1;
        if (transaction.duplicateMatches && transaction.duplicateMatches.length > 0) duplicateCount += 1;
        if (transaction.shouldIgnore || transaction.warnings?.some((warning) => warning.toLowerCase().includes("ignora"))) {
            ignoredCount += 1;
        }

        if (transaction.amount > 0) totalIncome += transaction.amount;
        else totalExpenses += Math.abs(transaction.amount);

        if (transaction.amount < 0) {
            totalsByCategory.set(transaction.category, (totalsByCategory.get(transaction.category) ?? 0) + Math.abs(transaction.amount));
        }
    }

    return {
        totalIncome,
        totalExpenses,
        ambiguousCount,
        duplicateCount,
        ignoredCount,
        totalsByCategory: [...totalsByCategory.entries()]
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount),
    };
}
