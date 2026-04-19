import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
    enrichBudgetImportDraft,
    normalizeMerchantName,
    summarizeBudgetImportBatch,
    type BudgetExistingTransactionLite,
    type BudgetImportTransactionDraft,
    type BudgetMerchantRuleLite,
} from "@/lib/budget-import";
import type { PendingAction } from "@/types";

export interface PendingBudgetImportBatchPayload {
    transactions: BudgetImportTransactionDraft[];
    note?: string | null;
}

export interface PendingBudgetMerchantRulePayload {
    merchant: string;
    normalizedMerchant: string;
    mode: "categorize" | "ignore";
    category?: string | null;
    alias?: string | null;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function formatSignedEuro(value: number): string {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${value < 0 ? "-" : ""}${formatted} EUR`;
}

export async function loadBudgetCategoryRules(userId: string) {
    const pref = await prisma.preference.findUnique({
        where: { userId },
        select: { budgetCategoriesList: true },
    });
    const categories = parseJson<Array<{ name: string; keywords?: string[] }>>(pref?.budgetCategoriesList, []);
    return categories.map((category) => ({
        name: category.name,
        keywords: Array.isArray(category.keywords) ? category.keywords : [],
    }));
}

export async function loadBudgetMerchantRules(userId: string): Promise<BudgetMerchantRuleLite[]> {
    const rules = await prisma.budgetMerchantRule.findMany({
        where: { userId },
        orderBy: [
            { hits: "desc" },
            { updatedAt: "desc" },
        ],
    });
    return rules.map((rule) => ({
        normalizedMerchant: rule.normalizedMerchant,
        displayName: rule.displayName,
        category: rule.category,
        mode: rule.mode as "categorize" | "ignore",
        alias: rule.alias,
    }));
}

export async function loadExistingBudgetTransactions(userId: string, limit = 400): Promise<BudgetExistingTransactionLite[]> {
    const transactions = await prisma.budgetTransaction.findMany({
        where: { userId },
        orderBy: { importedAt: "desc" },
        take: limit,
        select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            category: true,
            merchantNormalized: true,
        },
    });
    return transactions;
}

export async function prepareBudgetImportTransactions(args: {
    userId: string;
    transactions: BudgetImportTransactionDraft[];
}): Promise<BudgetImportTransactionDraft[]> {
    const [categories, merchantRules, existing] = await Promise.all([
        loadBudgetCategoryRules(args.userId),
        loadBudgetMerchantRules(args.userId),
        loadExistingBudgetTransactions(args.userId),
    ]);

    return args.transactions.map((transaction) =>
        enrichBudgetImportDraft({
            transaction,
            customCategories: categories,
            merchantRules,
            existing,
        }),
    );
}

export function buildBudgetImportPreview(payload: PendingBudgetImportBatchPayload): string {
    const summary = summarizeBudgetImportBatch(payload.transactions);
    const previewLines = payload.transactions.slice(0, 8).map((transaction) => {
        const warningSuffix = transaction.warnings && transaction.warnings.length > 0
            ? ` | note: ${transaction.warnings[0]}`
            : "";
        const confidenceSuffix = transaction.confidence ? ` | conf: ${transaction.confidence}` : "";
        return `- ${transaction.date} | ${transaction.description} | ${formatSignedEuro(transaction.amount)} | ${transaction.category}${confidenceSuffix}${warningSuffix}`;
    });
    const extraCount = payload.transactions.length - previewLines.length;
    const categoryLines = summary.totalsByCategory.slice(0, 5).map((entry) => `- ${entry.category}: ${formatSignedEuro(-entry.amount)}`);

    return [
        `${payload.transactions.length} transazioni da importare:`,
        ...previewLines,
        extraCount > 0 ? `- ...altre ${extraCount} transazioni` : null,
        "",
        `Totale uscite: ${formatSignedEuro(-summary.totalExpenses)}`,
        `Totale entrate: ${formatSignedEuro(summary.totalIncome)}`,
        summary.ambiguousCount > 0 ? `Righe ambigue: ${summary.ambiguousCount}` : null,
        summary.duplicateCount > 0 ? `Possibili duplicati: ${summary.duplicateCount}` : null,
        summary.ignoredCount > 0 ? `Righe ignorate da regole utente: ${summary.ignoredCount}` : null,
        payload.note ? `Nota utente: ${payload.note}` : null,
        categoryLines.length > 0 ? "" : null,
        ...(categoryLines.length > 0 ? ["Top categorie:", ...categoryLines] : []),
    ].filter(Boolean).join("\n");
}

async function findThreadSourceFiles(threadId: string) {
    const userMessage = await prisma.assistantMessage.findFirst({
        where: {
            threadId,
            role: "user",
            attachments: { some: {} },
        },
        orderBy: { createdAt: "desc" },
        include: {
            attachments: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    kind: true,
                    mimeType: true,
                    filename: true,
                    size: true,
                },
            },
        },
    });

    return (userMessage?.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        kind: attachment.kind,
        mimeType: attachment.mimeType,
        filename: attachment.filename,
        size: attachment.size,
    }));
}

async function incrementMerchantRuleUsage(
    db: Prisma.TransactionClient,
    args: {
    userId: string;
    normalizedMerchant: string;
    category: string;
    displayName: string;
},
) {
    await db.budgetMerchantRule.upsert({
        where: {
            userId_normalizedMerchant_mode: {
                userId: args.userId,
                normalizedMerchant: args.normalizedMerchant,
                mode: "categorize",
            },
        },
        update: {
            category: args.category,
            displayName: args.displayName,
            hits: { increment: 1 },
            lastUsedAt: new Date(),
        },
        create: {
            userId: args.userId,
            normalizedMerchant: args.normalizedMerchant,
            displayName: args.displayName,
            category: args.category,
            mode: "categorize",
            hits: 1,
            lastUsedAt: new Date(),
        },
    });
}

export async function saveConfirmedBudgetImportBatch(args: {
    userId: string;
    threadId: string;
    channel: string;
    title: string;
    payload: PendingBudgetImportBatchPayload;
}): Promise<{
    batchId: string;
    insertedCount: number;
    skippedCount: number;
    totalCount: number;
    totalIncome: number;
    totalExpenses: number;
}> {
    const sourceFiles = await findThreadSourceFiles(args.threadId);
    const prepared = await prepareBudgetImportTransactions({
        userId: args.userId,
        transactions: args.payload.transactions,
    });
    const summary = summarizeBudgetImportBatch(prepared);

    return prisma.$transaction(async (tx) => {
        const batch = await tx.budgetImportBatch.create({
            data: {
                userId: args.userId,
                threadId: args.threadId,
                channel: args.channel,
                title: args.title,
                sourceKind: sourceFiles.length > 1 ? "album" : sourceFiles[0]?.kind ?? "text",
                sourceFiles: JSON.stringify(sourceFiles),
                summary: buildBudgetImportPreview({
                    transactions: prepared,
                    note: args.payload.note ?? null,
                }),
                payload: JSON.stringify({ ...args.payload, transactions: prepared }),
                totalCount: prepared.length,
                totalIncome: summary.totalIncome,
                totalExpenses: summary.totalExpenses,
                confirmedAt: new Date(),
            },
        });

        let insertedCount = 0;
        let skippedCount = 0;
        const seenHashes = new Set<string>();

        for (const transaction of prepared) {
            if (transaction.shouldIgnore) {
                skippedCount += 1;
                continue;
            }

            const merchantNormalized = transaction.merchantNormalized ?? normalizeMerchantName(transaction.description);
            const hash = [
                transaction.date,
                merchantNormalized || transaction.description.toLowerCase(),
                Math.abs(transaction.amount).toFixed(2),
            ].join("|");

            if (seenHashes.has(hash)) {
                skippedCount += 1;
                continue;
            }
            seenHashes.add(hash);

            const fuzzyDuplicate = await tx.budgetTransaction.findFirst({
                where: {
                    userId: args.userId,
                    amount: transaction.amount,
                    date: transaction.date,
                    OR: [
                        ...(merchantNormalized ? [{ merchantNormalized }] : []),
                        { description: transaction.description },
                    ],
                },
                select: { id: true },
            });

            if (fuzzyDuplicate) {
                skippedCount += 1;
                continue;
            }

            await tx.budgetTransaction.create({
                data: {
                    userId: args.userId,
                    date: transaction.date,
                    description: transaction.description,
                    amount: transaction.amount,
                    category: transaction.category,
                    categoryOverride: false,
                    hash,
                    merchantNormalized,
                    movementType: transaction.movementType ?? "standard",
                    importConfidence: transaction.confidence ?? null,
                    importBatchId: batch.id,
                },
            });
            insertedCount += 1;

            if (
                merchantNormalized
                && merchantNormalized.length >= 3
                && transaction.category
                && transaction.category !== "Altro"
                && transaction.movementType !== "transfer"
                && transaction.movementType !== "unknown"
            ) {
                await incrementMerchantRuleUsage(tx, {
                    userId: args.userId,
                    normalizedMerchant: merchantNormalized,
                    category: transaction.category,
                    displayName: transaction.merchant || transaction.description,
                });
            }
        }

        await tx.budgetImportBatch.update({
            where: { id: batch.id },
            data: {
                insertedCount,
                skippedCount,
            },
        });

        return {
            batchId: batch.id,
            insertedCount,
            skippedCount,
            totalCount: prepared.length,
            totalIncome: summary.totalIncome,
            totalExpenses: summary.totalExpenses,
        };
    });
}

export async function rollbackLatestBudgetImportBatch(args: {
    userId: string;
    channel?: string;
}): Promise<{
    batchId: string;
    deletedCount: number;
    title: string;
} | null> {
    const batch = await prisma.budgetImportBatch.findFirst({
        where: {
            userId: args.userId,
            status: "confirmed",
            rolledBackAt: null,
            ...(args.channel ? { channel: args.channel } : {}),
        },
        orderBy: { confirmedAt: "desc" },
        select: {
            id: true,
            title: true,
        },
    });

    if (!batch) return null;

    const deleted = await prisma.budgetTransaction.deleteMany({
        where: {
            userId: args.userId,
            importBatchId: batch.id,
        },
    });

    await prisma.budgetImportBatch.update({
        where: { id: batch.id },
        data: {
            status: "rolled_back",
            rolledBackAt: new Date(),
        },
    });

    return {
        batchId: batch.id,
        deletedCount: deleted.count,
        title: batch.title,
    };
}

export async function listRecentBudgetTransactions(args: {
    userId: string;
    limit?: number;
}) {
    return prisma.budgetTransaction.findMany({
        where: { userId: args.userId },
        orderBy: [
            { date: "desc" },
            { importedAt: "desc" },
        ],
        take: args.limit ?? 10,
        select: {
            id: true,
            date: true,
            description: true,
            amount: true,
            category: true,
            movementType: true,
        },
    });
}

export async function listBudgetCategoriesAndRules(userId: string) {
    const [categories, rules] = await Promise.all([
        loadBudgetCategoryRules(userId),
        prisma.budgetMerchantRule.findMany({
            where: { userId },
            orderBy: [
                { hits: "desc" },
                { updatedAt: "desc" },
            ],
            take: 12,
        }),
    ]);

    return {
        categories,
        rules: rules.map((rule) => ({
            displayName: rule.displayName,
            normalizedMerchant: rule.normalizedMerchant,
            mode: rule.mode,
            category: rule.category,
            alias: rule.alias,
            hits: rule.hits,
        })),
    };
}

export async function reapplyBudgetRules(args: {
    userId: string;
    month?: string;
    limit?: number;
}): Promise<{ updated: number }> {
    const [categories, merchantRules] = await Promise.all([
        loadBudgetCategoryRules(args.userId),
        loadBudgetMerchantRules(args.userId),
    ]);

    const transactions = await prisma.budgetTransaction.findMany({
        where: {
            userId: args.userId,
            categoryOverride: false,
            ...(args.month
                ? {
                    date: {
                        gte: `${args.month}-01`,
                        lt: `${args.month}-31`,
                    },
                }
                : {}),
        },
        orderBy: { importedAt: "desc" },
        take: args.limit ?? 300,
    });

    let updated = 0;
    for (const transaction of transactions) {
        const enriched = enrichBudgetImportDraft({
            transaction: {
                date: transaction.date,
                description: transaction.description,
                amount: transaction.amount,
                category: transaction.category,
                merchantNormalized: transaction.merchantNormalized,
            },
            customCategories: categories,
            merchantRules,
            existing: [],
        });

        if (enriched.category !== transaction.category || enriched.movementType !== transaction.movementType) {
            await prisma.budgetTransaction.update({
                where: { id: transaction.id },
                data: {
                    category: enriched.category,
                    merchantNormalized: enriched.merchantNormalized,
                    movementType: enriched.movementType ?? transaction.movementType,
                },
            });
            updated += 1;
        }
    }

    return { updated };
}

export async function getLatestPendingBudgetImportAction(args: {
    userId: string;
    threadId?: string | null;
}): Promise<(PendingAction & { payload: PendingBudgetImportBatchPayload }) | null> {
    const action = await prisma.assistantPendingAction.findFirst({
        where: {
            userId: args.userId,
            kind: "add_budget_transactions_batch",
            status: "pending",
            ...(args.threadId ? { threadId: args.threadId } : {}),
        },
        orderBy: { createdAt: "desc" },
    });

    if (!action) return null;

    return {
        id: action.id,
        threadId: action.threadId,
        assistantMessageId: action.assistantMessageId,
        channel: action.channel as PendingAction["channel"],
        kind: action.kind as PendingAction["kind"],
        status: action.status as PendingAction["status"],
        title: action.title,
        previewText: action.previewText,
        resultSummary: action.resultSummary,
        createdAt: action.createdAt.toISOString(),
        updatedAt: action.updatedAt.toISOString(),
        confirmedAt: action.confirmedAt?.toISOString() ?? null,
        cancelledAt: action.cancelledAt?.toISOString() ?? null,
        executedAt: action.executedAt?.toISOString() ?? null,
        payload: parseJson<PendingBudgetImportBatchPayload>(action.payload, { transactions: [] }),
    };
}
