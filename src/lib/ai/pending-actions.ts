import { createHash } from "crypto";
import type { AssistantPendingAction as PrismaPendingAction, AssistantThread } from "@prisma/client";
import prisma from "@/lib/prisma";
import type {
    AssistantChannel,
    PendingAction,
    PendingActionKind,
    PendingActionStatus,
} from "@/types";
import type { AiToolTraceEntry } from "@/lib/ai/providers";

type PendingActionPayloadMap = {
    add_budget_transaction: {
        date: string;
        description: string;
        amount: number;
        category: string;
    };
    delete_budget_transaction: {
        transactionId: string;
        description?: string;
    };
    update_budget_transaction_category: {
        transactionId: string;
        category: string;
    };
    create_goal: {
        name: string;
        targetAmount: number;
        currentAmount: number;
        deadline?: string | null;
        category: string;
    };
    update_goal: {
        goalId: string;
        name?: string;
        targetAmount?: number;
        currentAmount?: number;
        deadline?: string | null;
        category?: string;
    };
    delete_goal: {
        goalId: string;
        name?: string;
    };
    add_memory: {
        category: string;
        fact: string;
        pinned?: boolean;
        source?: "auto" | "manual";
    };
    delete_memory: {
        memoryId: string;
        fact?: string;
    };
    toggle_memory_pin: {
        memoryId: string;
        pinned: boolean;
    };
};

export interface PendingActionDraft<K extends PendingActionKind = PendingActionKind> {
    kind: K;
    title: string;
    previewText: string;
    payload: PendingActionPayloadMap[K];
}

interface PendingActionDraftEnvelope {
    requiresConfirmation: true;
    preview: string;
    pendingActionDraft: PendingActionDraft;
}

export function buildPendingActionResult<K extends PendingActionKind>(
    kind: K,
    title: string,
    previewText: string,
    payload: PendingActionPayloadMap[K],
): PendingActionDraftEnvelope {
    return {
        requiresConfirmation: true,
        preview: previewText,
        pendingActionDraft: {
            kind,
            title,
            previewText,
            payload,
        },
    };
}

export function hashBudgetTransaction(date: string, description: string, amount: number): string {
    return createHash("sha256")
        .update(`${date}|${description}|${amount.toFixed(2)}`)
        .digest("hex");
}

function isPendingActionDraftEnvelope(value: unknown): value is PendingActionDraftEnvelope {
    if (!value || typeof value !== "object") return false;
    const envelope = value as Partial<PendingActionDraftEnvelope>;
    return envelope.requiresConfirmation === true
        && typeof envelope.preview === "string"
        && !!envelope.pendingActionDraft
        && typeof envelope.pendingActionDraft === "object";
}

export function extractPendingActionDrafts(toolTrace: AiToolTraceEntry[]): PendingActionDraft[] {
    return toolTrace
        .map((entry) => entry.result)
        .filter(isPendingActionDraftEnvelope)
        .map((result) => result.pendingActionDraft);
}

export function serializePendingAction(action: PrismaPendingAction): PendingAction {
    return {
        id: action.id,
        threadId: action.threadId,
        assistantMessageId: action.assistantMessageId,
        channel: action.channel as AssistantChannel,
        kind: action.kind as PendingActionKind,
        status: action.status as PendingActionStatus,
        title: action.title,
        previewText: action.previewText,
        resultSummary: action.resultSummary,
        createdAt: action.createdAt.toISOString(),
        updatedAt: action.updatedAt.toISOString(),
        confirmedAt: action.confirmedAt?.toISOString() ?? null,
        cancelledAt: action.cancelledAt?.toISOString() ?? null,
        executedAt: action.executedAt?.toISOString() ?? null,
    };
}

export async function persistPendingActionDrafts(args: {
    userId: string;
    threadId: string;
    assistantMessageId: string;
    channel: AssistantChannel;
    toolTrace: AiToolTraceEntry[];
}): Promise<PendingAction[]> {
    const drafts = extractPendingActionDrafts(args.toolTrace);
    if (drafts.length === 0) return [];

    const records: PendingAction[] = [];
    for (const draft of drafts) {
        const created = await prisma.assistantPendingAction.create({
            data: {
                userId: args.userId,
                threadId: args.threadId,
                assistantMessageId: args.assistantMessageId,
                channel: args.channel,
                kind: draft.kind,
                title: draft.title,
                previewText: draft.previewText,
                payload: JSON.stringify(draft.payload),
            },
        });
        records.push(serializePendingAction(created));
    }
    return records;
}

async function executePendingAction(userId: string, action: PrismaPendingAction): Promise<string> {
    const payload = JSON.parse(action.payload) as PendingActionPayloadMap[PendingActionKind];

    switch (action.kind as PendingActionKind) {
    case "add_budget_transaction": {
        const data = payload as PendingActionPayloadMap["add_budget_transaction"];
        const hash = hashBudgetTransaction(data.date, data.description, data.amount);
        await prisma.budgetTransaction.upsert({
            where: { userId_hash: { userId, hash } },
            update: {
                date: data.date,
                description: data.description,
                amount: data.amount,
                category: data.category,
            },
            create: {
                userId,
                date: data.date,
                description: data.description,
                amount: data.amount,
                category: data.category,
                hash,
            },
        });
        return `Transazione salvata: ${data.description} (${data.amount.toFixed(2)} EUR)`;
    }
    case "delete_budget_transaction": {
        const data = payload as PendingActionPayloadMap["delete_budget_transaction"];
        await prisma.budgetTransaction.deleteMany({
            where: { id: data.transactionId, userId },
        });
        return `Transazione eliminata${data.description ? `: ${data.description}` : ""}`;
    }
    case "update_budget_transaction_category": {
        const data = payload as PendingActionPayloadMap["update_budget_transaction_category"];
        await prisma.budgetTransaction.updateMany({
            where: { id: data.transactionId, userId },
            data: {
                category: data.category,
                categoryOverride: true,
            },
        });
        return `Categoria aggiornata a ${data.category}`;
    }
    case "create_goal": {
        const data = payload as PendingActionPayloadMap["create_goal"];
        await prisma.savingsGoal.create({
            data: {
                userId,
                name: data.name,
                targetAmount: data.targetAmount,
                currentAmount: data.currentAmount,
                deadline: data.deadline ?? null,
                category: data.category,
            },
        });
        return `Obiettivo creato: ${data.name}`;
    }
    case "update_goal": {
        const data = payload as PendingActionPayloadMap["update_goal"];
        const updated = await prisma.savingsGoal.updateMany({
            where: { id: data.goalId, userId },
            data: {
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.targetAmount !== undefined ? { targetAmount: data.targetAmount } : {}),
                ...(data.currentAmount !== undefined ? { currentAmount: data.currentAmount } : {}),
                ...(data.deadline !== undefined ? { deadline: data.deadline } : {}),
                ...(data.category !== undefined ? { category: data.category } : {}),
            },
        });
        if (updated.count === 0) {
            throw new Error("Obiettivo non trovato");
        }
        return "Obiettivo aggiornato";
    }
    case "delete_goal": {
        const data = payload as PendingActionPayloadMap["delete_goal"];
        await prisma.savingsGoal.deleteMany({
            where: { id: data.goalId, userId },
        });
        return `Obiettivo eliminato${data.name ? `: ${data.name}` : ""}`;
    }
    case "add_memory": {
        const data = payload as PendingActionPayloadMap["add_memory"];
        const existing = await prisma.assistantMemory.findFirst({
            where: {
                userId,
                category: data.category,
                fact: data.fact,
            },
        });
        if (existing) {
            await prisma.assistantMemory.update({
                where: { id: existing.id },
                data: {
                    pinned: data.pinned ?? existing.pinned,
                    source: data.source ?? existing.source,
                },
            });
        } else {
            await prisma.assistantMemory.create({
                data: {
                    userId,
                    category: data.category,
                    fact: data.fact,
                    pinned: data.pinned ?? false,
                    source: data.source ?? "manual",
                },
            });
        }
        return "Fatto salvato nella memoria";
    }
    case "delete_memory": {
        const data = payload as PendingActionPayloadMap["delete_memory"];
        await prisma.assistantMemory.deleteMany({
            where: { id: data.memoryId, userId },
        });
        return "Fatto rimosso dalla memoria";
    }
    case "toggle_memory_pin": {
        const data = payload as PendingActionPayloadMap["toggle_memory_pin"];
        const updated = await prisma.assistantMemory.updateMany({
            where: { id: data.memoryId, userId },
            data: { pinned: data.pinned },
        });
        if (updated.count === 0) {
            throw new Error("Fatto memoria non trovato");
        }
        return data.pinned ? "Fatto pinnato" : "Pin rimosso";
    }
    default:
        throw new Error(`Pending action non supportata: ${action.kind}`);
    }
}

export async function appendPendingActionOutcomeMessage(args: {
    thread: Pick<AssistantThread, "id" | "channel">;
    summary: string;
}): Promise<void> {
    await prisma.assistantMessage.create({
        data: {
            threadId: args.thread.id,
            role: "assistant",
            content: args.summary,
        },
    });
    await prisma.assistantThread.update({
        where: { id: args.thread.id },
        data: { updatedAt: new Date() },
    });
}

export async function confirmPendingAction(args: {
    actionId: string;
    userId: string;
}): Promise<{ action: PendingAction; summary: string; threadId: string; channel: AssistantChannel }> {
    const action = await prisma.assistantPendingAction.findFirst({
        where: { id: args.actionId, userId: args.userId },
        include: {
            thread: {
                select: {
                    id: true,
                    channel: true,
                },
            },
        },
    });
    if (!action) {
        throw new Error("Azione non trovata");
    }
    if (action.status !== "pending") {
        throw new Error("Azione già processata");
    }

    try {
        const summary = await executePendingAction(args.userId, action);
        const updated = await prisma.assistantPendingAction.update({
            where: { id: action.id },
            data: {
                status: "confirmed",
                confirmedAt: new Date(),
                executedAt: new Date(),
                resultSummary: summary,
            },
        });
        await appendPendingActionOutcomeMessage({ thread: action.thread, summary });
        return {
            action: serializePendingAction(updated),
            summary,
            threadId: action.thread.id,
            channel: action.thread.channel as AssistantChannel,
        };
    } catch (error) {
        const message = (error as Error).message;
        const failed = await prisma.assistantPendingAction.update({
            where: { id: action.id },
            data: {
                status: "failed",
                confirmedAt: new Date(),
                resultSummary: message,
            },
        });
        throw new Error(`Esecuzione fallita: ${serializePendingAction(failed).resultSummary}`);
    }
}

export async function cancelPendingAction(args: {
    actionId: string;
    userId: string;
}): Promise<{ action: PendingAction; summary: string; threadId: string; channel: AssistantChannel }> {
    const action = await prisma.assistantPendingAction.findFirst({
        where: { id: args.actionId, userId: args.userId },
        include: {
            thread: {
                select: {
                    id: true,
                    channel: true,
                },
            },
        },
    });
    if (!action) {
        throw new Error("Azione non trovata");
    }
    if (action.status !== "pending") {
        throw new Error("Azione già processata");
    }

    const summary = `Azione annullata: ${action.title}`;
    const updated = await prisma.assistantPendingAction.update({
        where: { id: action.id },
        data: {
            status: "canceled",
            cancelledAt: new Date(),
            resultSummary: summary,
        },
    });
    await appendPendingActionOutcomeMessage({ thread: action.thread, summary });
    return {
        action: serializePendingAction(updated),
        summary,
        threadId: action.thread.id,
        channel: action.thread.channel as AssistantChannel,
    };
}
