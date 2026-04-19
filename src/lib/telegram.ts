import { randomBytes, randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { renderTelegramHtml } from "@/lib/telegram-format";
import type { PendingAction, TelegramBotState } from "@/types";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const TELEGRAM_LINK_TTL_MS = 1000 * 60 * 60 * 24 * 3;
const TELEGRAM_MESSAGE_LIMIT = 3800;

export interface TelegramConnectionRecord {
    id: string;
    userId: string;
    botTokenEnc: string;
    botId: string | null;
    botUsername: string | null;
    botFirstName: string | null;
    webhookSecret: string;
    botStatus: string;
    linkStatus: string;
    linkCode: string | null;
    linkCodeExpiresAt: Date | null;
    telegramUserId: string | null;
    telegramChatId: string | null;
    telegramUsername: string | null;
    linkedAt: Date | null;
    currentThreadId: string | null;
    lastWebhookAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface TelegramApiEnvelope<T> {
    ok: boolean;
    result?: T;
    description?: string;
}

interface TelegramBotIdentity {
    id: number;
    username?: string;
    first_name?: string;
}

interface TelegramFileMetadata {
    file_id: string;
    file_size?: number;
    file_path?: string;
}

function getAppBaseUrl(): string {
    const baseUrl = process.env.APP_BASE_URL?.trim();
    if (!baseUrl) {
        throw new Error("APP_BASE_URL non configurata");
    }
    return baseUrl.replace(/\/+$/, "");
}

function serializeTelegramState(connection: TelegramConnectionRecord | null): TelegramBotState {
    if (!connection) {
        return {
            configured: false,
            botStatus: null,
            linkStatus: null,
            botUsername: null,
            botFirstName: null,
            deepLink: null,
            linkedTelegramUsername: null,
            linkedAt: null,
            lastError: null,
        };
    }

    const startParam = connection.linkStatus === "linked" ? null : connection.linkCode;
    const deepLink = connection.botUsername
        ? `https://t.me/${connection.botUsername}${startParam ? `?start=${startParam}` : ""}`
        : null;

    return {
        configured: true,
        botStatus: connection.botStatus as TelegramBotState["botStatus"],
        linkStatus: connection.linkStatus as TelegramBotState["linkStatus"],
        botUsername: connection.botUsername,
        botFirstName: connection.botFirstName,
        deepLink,
        linkedTelegramUsername: connection.telegramUsername,
        linkedAt: connection.linkedAt?.toISOString() ?? null,
        lastError: connection.lastError,
    };
}

function createLinkCode(): string {
    return randomBytes(8).toString("hex");
}

function createWebhookSecret(): string {
    return randomBytes(24).toString("hex");
}

function getWebhookUrl(connectionId: string): string {
    return `${getAppBaseUrl()}/api/telegram/webhook/${connectionId}`;
}

function selectConnection() {
    return {
        id: true,
        userId: true,
        botTokenEnc: true,
        botId: true,
        botUsername: true,
        botFirstName: true,
        webhookSecret: true,
        botStatus: true,
        linkStatus: true,
        linkCode: true,
        linkCodeExpiresAt: true,
        telegramUserId: true,
        telegramChatId: true,
        telegramUsername: true,
        linkedAt: true,
        currentThreadId: true,
        lastWebhookAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
    } as const;
}

async function telegramApiRequest<T>(
    botToken: string,
    method: string,
    payload?: Record<string, unknown>,
): Promise<T> {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
    });

    const json = await res.json().catch(() => ({})) as TelegramApiEnvelope<T>;
    if (!res.ok || !json.ok || json.result === undefined) {
        throw new Error(json.description || `Telegram API error (${method})`);
    }
    return json.result;
}

export async function telegramGetMe(botToken: string): Promise<TelegramBotIdentity> {
    return telegramApiRequest<TelegramBotIdentity>(botToken, "getMe");
}

export async function registerTelegramWebhook(args: {
    botToken: string;
    connectionId: string;
    webhookSecret: string;
}): Promise<void> {
    await telegramApiRequest<boolean>(args.botToken, "setWebhook", {
        url: getWebhookUrl(args.connectionId),
        secret_token: args.webhookSecret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false,
    });
}

export async function deleteTelegramWebhook(botToken: string): Promise<void> {
    await telegramApiRequest<boolean>(botToken, "deleteWebhook", {
        drop_pending_updates: false,
    });
}

export async function getTelegramConnectionForUser(userId: string): Promise<TelegramConnectionRecord | null> {
    return prisma.telegramBotConnection.findUnique({
        where: { userId },
        select: selectConnection(),
    });
}

export async function getTelegramConnectionForWebhook(connectionId: string): Promise<TelegramConnectionRecord | null> {
    return prisma.telegramBotConnection.findUnique({
        where: { id: connectionId },
        select: selectConnection(),
    });
}

async function ensureTelegramLinkCode(connection: TelegramConnectionRecord): Promise<TelegramConnectionRecord> {
    const needsLinkCode = connection.linkStatus !== "linked"
        && (!connection.linkCode || !connection.linkCodeExpiresAt || connection.linkCodeExpiresAt.getTime() <= Date.now());

    if (!needsLinkCode) {
        return connection;
    }

    return prisma.telegramBotConnection.update({
        where: { id: connection.id },
        data: {
            linkCode: createLinkCode(),
            linkCodeExpiresAt: new Date(Date.now() + TELEGRAM_LINK_TTL_MS),
            lastError: null,
        },
        select: selectConnection(),
    });
}

export async function getTelegramBotStateForUser(userId: string): Promise<TelegramBotState> {
    const connection = await getTelegramConnectionForUser(userId);
    if (!connection) {
        return serializeTelegramState(null);
    }
    return serializeTelegramState(await ensureTelegramLinkCode(connection));
}

export async function saveTelegramBotForUser(args: {
    userId: string;
    botToken: string;
}): Promise<TelegramBotState> {
    const botToken = args.botToken.trim();
    if (!botToken) {
        throw new Error("Token BotFather mancante");
    }

    const identity = await telegramGetMe(botToken);
    const existing = await getTelegramConnectionForUser(args.userId);

    if (existing) {
        try {
            await deleteTelegramWebhook(decrypt(existing.botTokenEnc));
        } catch {
            /* noop */
        }
    }

    const connectionId = existing?.id ?? randomUUID();
    const webhookSecret = createWebhookSecret();
    await registerTelegramWebhook({
        botToken,
        connectionId,
        webhookSecret,
    });

    await prisma.telegramBotConnection.upsert({
        where: { userId: args.userId },
        update: {
            botTokenEnc: encrypt(botToken),
            botId: String(identity.id),
            botUsername: identity.username ?? null,
            botFirstName: identity.first_name ?? null,
            webhookSecret,
            botStatus: "configured",
            linkStatus: "pending",
            linkCode: createLinkCode(),
            linkCodeExpiresAt: new Date(Date.now() + TELEGRAM_LINK_TTL_MS),
            telegramUserId: null,
            telegramChatId: null,
            telegramUsername: null,
            linkedAt: null,
            currentThreadId: null,
            lastWebhookAt: null,
            lastError: null,
        },
        create: {
            id: connectionId,
            userId: args.userId,
            botTokenEnc: encrypt(botToken),
            botId: String(identity.id),
            botUsername: identity.username ?? null,
            botFirstName: identity.first_name ?? null,
            webhookSecret,
            botStatus: "configured",
            linkStatus: "pending",
            linkCode: createLinkCode(),
            linkCodeExpiresAt: new Date(Date.now() + TELEGRAM_LINK_TTL_MS),
        },
    });

    return getTelegramBotStateForUser(args.userId);
}

export async function deleteTelegramBotForUser(userId: string): Promise<TelegramBotState> {
    const connection = await getTelegramConnectionForUser(userId);
    if (!connection) {
        return serializeTelegramState(null);
    }

    try {
        await deleteTelegramWebhook(decrypt(connection.botTokenEnc));
    } catch {
        /* noop */
    }

    await prisma.telegramBotConnection.delete({
        where: { id: connection.id },
    });

    return serializeTelegramState(null);
}

export async function setTelegramWebhookError(connectionId: string, error: string | null): Promise<void> {
    const existing = await prisma.telegramBotConnection.findUnique({
        where: { id: connectionId },
        select: {
            linkStatus: true,
        },
    });

    if (!existing) return;

    await prisma.telegramBotConnection.update({
        where: { id: connectionId },
        data: {
            lastWebhookAt: new Date(),
            lastError: error,
            botStatus: error ? "error" : existing.linkStatus === "linked" ? "linked" : "configured",
        },
    });
}

export async function linkTelegramUser(args: {
    connectionId: string;
    telegramUserId: string;
    telegramChatId: string;
    telegramUsername?: string | null;
}): Promise<TelegramConnectionRecord> {
    return prisma.telegramBotConnection.update({
        where: { id: args.connectionId },
        data: {
            botStatus: "linked",
            linkStatus: "linked",
            linkCode: null,
            linkCodeExpiresAt: null,
            telegramUserId: args.telegramUserId,
            telegramChatId: args.telegramChatId,
            telegramUsername: args.telegramUsername ?? null,
            linkedAt: new Date(),
            lastWebhookAt: new Date(),
            lastError: null,
        },
        select: selectConnection(),
    });
}

export async function unlinkTelegramUser(connectionId: string): Promise<TelegramConnectionRecord> {
    return prisma.telegramBotConnection.update({
        where: { id: connectionId },
        data: {
            botStatus: "configured",
            linkStatus: "unlinked",
            linkCode: createLinkCode(),
            linkCodeExpiresAt: new Date(Date.now() + TELEGRAM_LINK_TTL_MS),
            telegramUserId: null,
            telegramChatId: null,
            telegramUsername: null,
            linkedAt: null,
            currentThreadId: null,
            lastWebhookAt: new Date(),
        },
        select: selectConnection(),
    });
}

export async function setTelegramCurrentThread(connectionId: string, threadId: string | null): Promise<void> {
    await prisma.telegramBotConnection.update({
        where: { id: connectionId },
        data: {
            currentThreadId: threadId,
            lastWebhookAt: new Date(),
            lastError: null,
        },
    });
}

export function decryptTelegramBotToken(connection: Pick<TelegramConnectionRecord, "botTokenEnc">): string {
    return decrypt(connection.botTokenEnc);
}

export async function getTelegramFileMetadata(args: {
    botToken: string;
    fileId: string;
}): Promise<TelegramFileMetadata> {
    return telegramApiRequest<TelegramFileMetadata>(args.botToken, "getFile", {
        file_id: args.fileId,
    });
}

export async function downloadTelegramFile(args: {
    botToken: string;
    filePath: string;
}): Promise<Uint8Array> {
    const res = await fetch(`${TELEGRAM_API_BASE}/file/bot${args.botToken}/${args.filePath}`);
    if (!res.ok) {
        throw new Error(`Telegram file download error (${res.status})`);
    }
    return new Uint8Array(await res.arrayBuffer());
}

function extractTelegramErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }
    if (typeof error === "string" && error.trim()) {
        return error.trim();
    }
    return "";
}

function isTelegramHtmlParseError(error: unknown): boolean {
    const message = extractTelegramErrorMessage(error);
    return /can't parse entities|unsupported start tag|unexpected end tag|entity beginning|tag mismatch/iu.test(message);
}

function findSentenceBoundary(text: string, limit: number): number {
    const window = text.slice(0, limit);
    const matches = [...window.matchAll(/[.!?]\s+/gu)];
    const lastMatch = matches.at(-1);
    return lastMatch ? lastMatch.index! + 1 : -1;
}

function findTelegramSplitBoundary(text: string): number {
    const preview = text.slice(0, TELEGRAM_MESSAGE_LIMIT);
    const minimumBoundary = Math.floor(TELEGRAM_MESSAGE_LIMIT * 0.6);
    const fenceMatches = preview.match(/```/gu) ?? [];

    if (fenceMatches.length % 2 === 1) {
        const lastFenceStart = preview.lastIndexOf("```");
        if (lastFenceStart > minimumBoundary) {
            return lastFenceStart;
        }
    }

    const candidates = [
        preview.lastIndexOf("\n\n"),
        preview.lastIndexOf("\n"),
        findSentenceBoundary(text, TELEGRAM_MESSAGE_LIMIT),
        preview.lastIndexOf(" "),
    ].filter((candidate) => candidate > minimumBoundary);

    return candidates.length > 0 ? Math.max(...candidates) : TELEGRAM_MESSAGE_LIMIT;
}

function splitTelegramChunk(text: string): string[] {
    const normalized = text.trim();
    if (!normalized) return [];

    const rendered = renderTelegramHtml(normalized);
    if (normalized.length <= TELEGRAM_MESSAGE_LIMIT && rendered.length <= TELEGRAM_MESSAGE_LIMIT) {
        return [normalized];
    }

    let boundary = findTelegramSplitBoundary(normalized);
    if (boundary <= 0 || boundary >= normalized.length) {
        boundary = Math.max(1, Math.min(normalized.length - 1, Math.floor(normalized.length / 2)));
    }

    const head = normalized.slice(0, boundary).trim();
    const tail = normalized.slice(boundary).trim();
    if (!head || !tail) {
        const fallbackBoundary = Math.max(1, Math.min(normalized.length - 1, Math.floor(normalized.length / 2)));
        const fallbackHead = normalized.slice(0, fallbackBoundary).trim();
        const fallbackTail = normalized.slice(fallbackBoundary).trim();
        return [
            ...splitTelegramChunk(fallbackHead),
            ...splitTelegramChunk(fallbackTail),
        ];
    }

    return [
        ...splitTelegramChunk(head),
        ...splitTelegramChunk(tail),
    ];
}

export function splitTelegramMessage(text: string): string[] {
    const normalized = text.trim();
    if (!normalized) return ["(nessuna risposta)"];
    return splitTelegramChunk(normalized);
}

export async function sendTelegramMessage(args: {
    botToken: string;
    chatId: string;
    text: string;
    replyMarkup?: Record<string, unknown>;
}): Promise<void> {
    const chunks = splitTelegramMessage(args.text);
    for (let index = 0; index < chunks.length; index += 1) {
        const replyMarkup = index === chunks.length - 1 ? args.replyMarkup : undefined;
        try {
            await telegramApiRequest(args.botToken, "sendMessage", {
                chat_id: args.chatId,
                text: renderTelegramHtml(chunks[index]),
                parse_mode: "HTML",
                disable_web_page_preview: true,
                reply_markup: replyMarkup,
            });
        } catch (error) {
            if (!isTelegramHtmlParseError(error)) {
                throw error;
            }

            await telegramApiRequest(args.botToken, "sendMessage", {
                chat_id: args.chatId,
                text: chunks[index],
                disable_web_page_preview: true,
                reply_markup: replyMarkup,
            });
        }
    }
}

export async function answerTelegramCallbackQuery(args: {
    botToken: string;
    callbackQueryId: string;
    text: string;
}): Promise<void> {
    await telegramApiRequest(args.botToken, "answerCallbackQuery", {
        callback_query_id: args.callbackQueryId,
        text: args.text.slice(0, 180),
        show_alert: false,
    });
}

export async function clearTelegramInlineKeyboard(args: {
    botToken: string;
    chatId: string;
    messageId: number;
}): Promise<void> {
    await telegramApiRequest(args.botToken, "editMessageReplyMarkup", {
        chat_id: args.chatId,
        message_id: args.messageId,
        reply_markup: { inline_keyboard: [] },
    });
}

export function buildPendingActionKeyboard(action: PendingAction): Record<string, unknown> {
    return {
        inline_keyboard: [
            [
                { text: "Conferma", callback_data: `confirm:${action.id}` },
                { text: "Annulla", callback_data: `cancel:${action.id}` },
            ],
        ],
    };
}
