import prisma from "@/lib/prisma";
import { chat, type AiChatMessage, type AiToolTraceEntry } from "@/lib/ai/providers";
import { buildAssistantSystemPrompt } from "@/lib/ai/prompt";
import { getStoredAiSettings } from "@/lib/ai/server-config";
import { buildAssistantDataJson, loadAssistantMemory, loadAssistantUserProfile } from "@/lib/ai/user-context";
import { extractAndPersistMemory } from "@/lib/ai/memory-extractor";
import { getServerAiTools } from "@/lib/ai/server-tools";
import { persistPendingActionDrafts } from "@/lib/ai/pending-actions";
import type { AssistantChannel, PendingAction } from "@/types";

interface IncomingAttachment {
    kind: "image" | "pdf";
    mimeType: string;
    filename: string;
    size: number;
    data: Uint8Array;
}

interface SerializableAttachment {
    id: string;
    kind: "image" | "pdf";
    mimeType: string;
    filename: string;
    size: number;
    url: string;
}

export interface AssistantMessageResponse {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolTrace: AiToolTraceEntry[] | null;
    attachments: SerializableAttachment[];
    pendingActions: PendingAction[];
    createdAt: string;
}

export interface ThreadSummaryResponse {
    id: string;
    title: string;
    channel: AssistantChannel;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
}

export interface AssistantTurnResult {
    thread: ThreadSummaryResponse;
    assistantMessage: AssistantMessageResponse;
    pendingActions: PendingAction[];
}

function serializeAttachment(attachment: {
    id: string;
    kind: string;
    mimeType: string;
    filename: string;
    size: number;
}): SerializableAttachment {
    return {
        id: attachment.id,
        kind: attachment.kind as "image" | "pdf",
        mimeType: attachment.mimeType,
        filename: attachment.filename,
        size: attachment.size,
        url: `/api/ai/attachments/${attachment.id}`,
    };
}

function attachmentToInput(attachment: {
    kind: string;
    mimeType: string;
    filename: string;
    size: number;
    data: Uint8Array;
}): NonNullable<AiChatMessage["attachments"]>[number] {
    return {
        kind: attachment.kind as "image" | "pdf",
        mimeType: attachment.mimeType,
        filename: attachment.filename,
        size: attachment.size,
        dataUrl: `data:${attachment.mimeType};base64,${Buffer.from(attachment.data).toString("base64")}`,
    };
}

function serializeMessage(message: {
    id: string;
    role: string;
    content: string;
    toolTrace: string | null;
    createdAt: Date;
    attachments: Array<{
        id: string;
        kind: string;
        mimeType: string;
        filename: string;
        size: number;
    }>;
}, pendingActions: PendingAction[] = []): AssistantMessageResponse {
    return {
        id: message.id,
        role: message.role as "user" | "assistant",
        content: message.content,
        toolTrace: message.toolTrace ? JSON.parse(message.toolTrace) as AiToolTraceEntry[] : null,
        attachments: message.attachments.map(serializeAttachment),
        pendingActions,
        createdAt: message.createdAt.toISOString(),
    };
}

async function ensureThread(args: {
    userId: string;
    channel: AssistantChannel;
    threadId?: string | null;
}): Promise<{ id: string; title: string; channel: AssistantChannel; createdAt: Date; updatedAt: Date; messageCount: number }> {
    if (args.threadId) {
        const thread = await prisma.assistantThread.findFirst({
            where: {
                id: args.threadId,
                userId: args.userId,
            },
            select: {
                id: true,
                title: true,
                channel: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { messages: true } },
            },
        });
        if (!thread) {
            throw new Error("Thread non trovato");
        }
        return {
            id: thread.id,
            title: thread.title,
            channel: thread.channel as AssistantChannel,
            createdAt: thread.createdAt,
            updatedAt: thread.updatedAt,
            messageCount: thread._count.messages,
        };
    }

    const created = await prisma.assistantThread.create({
        data: {
            userId: args.userId,
            channel: args.channel,
            title: "Nuova conversazione",
        },
        select: {
            id: true,
            title: true,
            channel: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { messages: true } },
        },
    });

    return {
        id: created.id,
        title: created.title,
        channel: created.channel as AssistantChannel,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        messageCount: created._count.messages,
    };
}

function serializeThreadSummary(thread: {
    id: string;
    title: string;
    channel: AssistantChannel;
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
}): ThreadSummaryResponse {
    return {
        id: thread.id,
        title: thread.title,
        channel: thread.channel,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        messageCount: thread.messageCount,
    };
}

export async function runAssistantTurn(args: {
    userId: string;
    threadId?: string | null;
    channel: AssistantChannel;
    prompt: string;
    attachments?: IncomingAttachment[];
    canWrite?: boolean;
}): Promise<AssistantTurnResult> {
    const settings = await getStoredAiSettings(args.userId);
    if (!settings) {
        throw new Error("Configura prima provider, API key e modello sul tuo account");
    }

    const thread = await ensureThread({
        userId: args.userId,
        channel: args.channel,
        threadId: args.threadId,
    });

    const content = args.prompt.trim();
    if (!content && (!args.attachments || args.attachments.length === 0)) {
        throw new Error("Serve testo o almeno un allegato");
    }

    const messageCountBefore = await prisma.assistantMessage.count({
        where: { threadId: thread.id },
    });

    const userMessage = await prisma.assistantMessage.create({
        data: {
            threadId: thread.id,
            role: "user",
            content,
            attachments: args.attachments?.length
                ? {
                    create: args.attachments.map((attachment) => ({
                        kind: attachment.kind,
                        mimeType: attachment.mimeType,
                        filename: attachment.filename.slice(0, 180),
                        size: attachment.size,
                        data: Buffer.from(attachment.data),
                    })),
                }
                : undefined,
        },
        include: {
            attachments: {
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (messageCountBefore === 0) {
        const fallbackTitle = userMessage.attachments[0]?.filename || "Nuova conversazione";
        await prisma.assistantThread.update({
            where: { id: thread.id },
            data: {
                title: content.slice(0, 60).replace(/\s+/g, " ").trim() || fallbackTitle,
            },
        });
    }

    const [messages, memory, userProfile, userDataJson] = await Promise.all([
        prisma.assistantMessage.findMany({
            where: { threadId: thread.id },
            orderBy: { createdAt: "asc" },
            include: {
                attachments: {
                    orderBy: { createdAt: "asc" },
                },
            },
        }),
        loadAssistantMemory(args.userId),
        loadAssistantUserProfile(args.userId),
        buildAssistantDataJson(args.userId),
    ]);

    const providerMessages: AiChatMessage[] = messages.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
        attachments: message.attachments.map(attachmentToInput),
    }));

    const reply = await chat({
        provider: settings.provider,
        apiKey: settings.apiKey,
        model: settings.model,
        systemPrompt: buildAssistantSystemPrompt(userProfile, userDataJson, memory),
        messages: providerMessages,
        tools: getServerAiTools({
            userId: args.userId,
            channel: args.channel,
            canWrite: args.canWrite ?? true,
        }),
    });

    const assistantText = reply.text || "(nessuna risposta)";
    const assistantMessage = await prisma.assistantMessage.create({
        data: {
            threadId: thread.id,
            role: "assistant",
            content: assistantText,
            toolTrace: reply.toolTrace.length > 0 ? JSON.stringify(reply.toolTrace) : null,
        },
        include: {
            attachments: {
                orderBy: { createdAt: "asc" },
            },
        },
    });

    const pendingActions = await persistPendingActionDrafts({
        userId: args.userId,
        threadId: thread.id,
        assistantMessageId: assistantMessage.id,
        channel: args.channel,
        toolTrace: reply.toolTrace,
    });

    await prisma.assistantThread.update({
        where: { id: thread.id },
        data: { updatedAt: new Date() },
    });

    if (content) {
        void extractAndPersistMemory({
            userId: args.userId,
            provider: settings.provider,
            apiKey: settings.apiKey,
            model: settings.model,
            userMessage: content,
            assistantMessage: assistantText,
        }).catch(() => undefined);
    }

    const refreshedThread = await prisma.assistantThread.findUnique({
        where: { id: thread.id },
        select: {
            id: true,
            title: true,
            channel: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { messages: true } },
        },
    });
    if (!refreshedThread) {
        throw new Error("Thread non trovato dopo il salvataggio");
    }

    return {
        thread: serializeThreadSummary({
            id: refreshedThread.id,
            title: refreshedThread.title,
            channel: refreshedThread.channel as AssistantChannel,
            createdAt: refreshedThread.createdAt,
            updatedAt: refreshedThread.updatedAt,
            messageCount: refreshedThread._count.messages,
        }),
        assistantMessage: serializeMessage(assistantMessage, pendingActions),
        pendingActions,
    };
}
