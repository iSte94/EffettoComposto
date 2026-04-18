import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runAssistantTurn } from "@/lib/ai/runtime";
import {
    AI_ATTACHMENT_MAX_FILES,
    AI_ATTACHMENT_MAX_TOTAL_BYTES,
    formatBytes,
    getAiAttachmentKind,
    validateAiAttachmentMeta,
} from "@/lib/ai/attachments";
import { cancelPendingAction, confirmPendingAction } from "@/lib/ai/pending-actions";
import {
    listBudgetCategoriesAndRules,
    listRecentBudgetTransactions,
    reapplyBudgetRules,
    rollbackLatestBudgetImportBatch,
} from "@/lib/budget-assistant";
import {
    answerTelegramCallbackQuery,
    buildPendingActionKeyboard,
    clearTelegramInlineKeyboard,
    decryptTelegramBotToken,
    downloadTelegramFile,
    getTelegramConnectionForWebhook,
    getTelegramFileMetadata,
    linkTelegramUser,
    sendTelegramMessage,
    setTelegramCurrentThread,
    setTelegramWebhookError,
    unlinkTelegramUser,
} from "@/lib/telegram";
import {
    markTelegramMediaGroupFailed,
    markTelegramMediaGroupProcessed,
    queueTelegramMediaGroupItem,
    waitForSettledTelegramMediaGroup,
} from "@/lib/telegram-media-groups";

interface TelegramUser {
    id: number;
    username?: string;
}

interface TelegramChat {
    id: number;
    type: string;
}

interface TelegramPhotoSize {
    file_id: string;
    file_size?: number;
    width: number;
    height: number;
}

interface TelegramDocument {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
}

interface TelegramMessage {
    message_id: number;
    text?: string;
    caption?: string;
    media_group_id?: string;
    chat: TelegramChat;
    from?: TelegramUser;
    photo?: TelegramPhotoSize[];
    document?: TelegramDocument;
}

interface TelegramCallbackQuery {
    id: string;
    data?: string;
    from: TelegramUser;
    message?: {
        message_id: number;
        chat: TelegramChat;
    };
}

interface TelegramUpdate {
    message?: TelegramMessage;
    callback_query?: TelegramCallbackQuery;
}

interface RuntimeAttachment {
    kind: "image" | "pdf";
    mimeType: string;
    filename: string;
    size: number;
    data: Uint8Array;
}

type TelegramConnection = NonNullable<Awaited<ReturnType<typeof getTelegramConnectionForWebhook>>>;

const HELP_TEXT = [
    "Comandi disponibili:",
    "/start <codice> collega il bot al tuo account",
    "/help mostra questo riepilogo",
    "/new apre una nuova conversazione Telegram",
    "/status mostra stato link e thread attivo",
    "/spesa attiva la modalita' import spese da screenshot o PDF",
    "/ultimespese [N] mostra le ultime spese importate",
    "/annullaultimoimport annulla l'ultimo batch importato da Telegram",
    "/categorie mostra categorie budget e regole merchant",
    "/ricategorizza [YYYY-MM] riapplica le regole budget ai movimenti automatici",
    "/unlink scollega il bot dal tuo account",
    "",
    "Dopo il collegamento puoi scrivere in linguaggio naturale, chiedere simulazioni e confermare le azioni direttamente dai pulsanti.",
    "Per importare spese invia /spesa come didascalia dello screenshot oppure scrivi /spesa e poi manda il file.",
].join("\n");

const EXPENSE_CAPTURE_ARM_PREFIX = "Modalita /spesa attiva.";
const EXPENSE_CAPTURE_ARM_MESSAGE = [
    `${EXPENSE_CAPTURE_ARM_PREFIX} Mandami ora uno screenshot o un PDF (estratto conto, app banca, scontrino).`,
    "Leggero' le transazioni visibili, le categorizzero', ti mostrero' cosa ho capito e salvero' tutto solo dopo il tuo ok.",
].join("\n");
const EXPENSE_CAPTURE_TTL_MS = 10 * 60 * 1000;

function getMessageText(message: TelegramMessage): string {
    return (message.text ?? message.caption ?? "").trim();
}

function parseCommand(text: string): { command: string; args: string } | null {
    if (!text.startsWith("/")) return null;
    const [rawCommand, ...rest] = text.trim().split(/\s+/);
    return {
        command: rawCommand.toLowerCase().replace(/@\w+$/, ""),
        args: rest.join(" ").trim(),
    };
}

function hasTelegramMedia(message: TelegramMessage): boolean {
    return Boolean(message.photo?.length || message.document);
}

function isAuthorizedTelegramUser(connection: TelegramConnection, from?: TelegramUser): boolean {
    return connection.linkStatus === "linked"
        && !!from
        && connection.telegramUserId === String(from.id);
}

function pickLargestTelegramPhoto(photos: TelegramPhotoSize[]): TelegramPhotoSize | null {
    if (!Array.isArray(photos) || photos.length === 0) return null;
    return [...photos].sort((a, b) => {
        const sizeDelta = (b.file_size ?? 0) - (a.file_size ?? 0);
        if (sizeDelta !== 0) return sizeDelta;
        return (b.width * b.height) - (a.width * a.height);
    })[0] ?? null;
}

function guessMimeTypeFromFilename(filename?: string): string {
    const normalized = filename?.trim().toLowerCase() ?? "";
    if (normalized.endsWith(".pdf")) return "application/pdf";
    if (normalized.endsWith(".png")) return "image/png";
    if (normalized.endsWith(".webp")) return "image/webp";
    if (normalized.endsWith(".gif")) return "image/gif";
    if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
    return "application/octet-stream";
}

function defaultExtensionForMimeType(mimeType: string): string {
    switch (mimeType) {
    case "application/pdf":
        return ".pdf";
    case "image/png":
        return ".png";
    case "image/webp":
        return ".webp";
    case "image/gif":
        return ".gif";
    default:
        return ".jpg";
    }
}

function formatSignedEuro(value: number): string {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${value < 0 ? "-" : "+"}${formatted} EUR`;
}

function isValidBudgetMonth(value: string): boolean {
    return /^\d{4}-\d{2}$/.test(value);
}

function parseRecentExpensesLimit(value: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 10;
    return Math.min(20, Math.max(1, parsed));
}

async function sendUnauthorizedMessage(botToken: string, chatId: string): Promise<void> {
    await sendTelegramMessage({
        botToken,
        chatId,
        text: "Questo bot non e' collegato a te. Apri la tab AI di Effetto Composto e usa il deep link personale per completare /start <codice>.",
    });
}

async function ensureTelegramThread(connection: TelegramConnection) {
    if (connection.currentThreadId) {
        const thread = await prisma.assistantThread.findFirst({
            where: { id: connection.currentThreadId, userId: connection.userId },
            select: { id: true, title: true },
        });
        if (thread) {
            return thread;
        }
    }

    const thread = await prisma.assistantThread.create({
        data: {
            userId: connection.userId,
            channel: "telegram",
            title: "Nuova conversazione Telegram",
        },
        select: { id: true, title: true },
    });
    await setTelegramCurrentThread(connection.id, thread.id);
    return thread;
}

async function appendTelegramAssistantNote(args: {
    threadId: string;
    content: string;
}): Promise<void> {
    await prisma.assistantMessage.create({
        data: {
            threadId: args.threadId,
            role: "assistant",
            content: args.content,
        },
    });
    await prisma.assistantThread.update({
        where: { id: args.threadId },
        data: { updatedAt: new Date() },
    });
}

async function replyWithTelegramThreadNote(args: {
    connection: TelegramConnection;
    botToken: string;
    chatId: string;
    text: string;
}): Promise<void> {
    const thread = await ensureTelegramThread(args.connection);
    await appendTelegramAssistantNote({
        threadId: thread.id,
        content: args.text,
    });
    await setTelegramCurrentThread(args.connection.id, thread.id);
    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: args.chatId,
        text: args.text,
    });
}

async function isExpenseCaptureArmed(connection: TelegramConnection): Promise<boolean> {
    if (!connection.currentThreadId) return false;

    const latestMessage = await prisma.assistantMessage.findFirst({
        where: { threadId: connection.currentThreadId },
        orderBy: { createdAt: "desc" },
        select: {
            role: true,
            content: true,
            createdAt: true,
        },
    });

    if (!latestMessage || latestMessage.role !== "assistant") return false;
    if (!latestMessage.content.startsWith(EXPENSE_CAPTURE_ARM_PREFIX)) return false;
    return Date.now() - latestMessage.createdAt.getTime() <= EXPENSE_CAPTURE_TTL_MS;
}

function buildExpenseCapturePrompt(note: string): string {
    return [
        "Analizza gli allegati come screenshot di spese, movimenti conto, ricevute o estratti conto.",
        "Estrai tutte le transazioni chiaramente leggibili e prova a ricavare per ciascuna: data, descrizione o esercente, importo, direzione (entrata o uscita) e categoria budget.",
        "Usa le categorie budget dell'utente quando disponibili. Se una categoria non e' chiara, proponi la migliore e segnala il dubbio.",
        "Segnala anche i casi speciali come rimborsi, storni, trasferimenti interni, prelievi, commissioni e abbonamenti.",
        "Non inventare dettagli mancanti: se una riga e' poco leggibile o incompleta, dillo apertamente.",
        "Nella risposta devi prima spiegare in modo ordinato cosa hai capito. Se hai dati sufficienti, usa il tool add_budget_transactions_batch per proporre un unico import da confermare.",
        note ? `Nota aggiuntiva dell'utente: ${note}` : "",
    ].filter(Boolean).join("\n");
}

async function downloadRuntimeAttachment(args: {
    botToken: string;
    fileId: string;
    mimeType: string;
    filename: string;
}): Promise<RuntimeAttachment> {
    const metadata = await getTelegramFileMetadata({
        botToken: args.botToken,
        fileId: args.fileId,
    });

    if (!metadata.file_path) {
        throw new Error("File Telegram non disponibile");
    }

    const bytes = await downloadTelegramFile({
        botToken: args.botToken,
        filePath: metadata.file_path,
    });

    const validationError = validateAiAttachmentMeta({
        name: args.filename,
        size: bytes.length,
        type: args.mimeType,
    });
    if (validationError) {
        throw new Error(validationError);
    }

    const kind = getAiAttachmentKind(args.mimeType);
    if (!kind) {
        throw new Error(`${args.filename}: formato non supportato`);
    }

    return {
        kind,
        mimeType: args.mimeType,
        filename: args.filename.slice(0, 180),
        size: bytes.length,
        data: bytes,
    };
}

async function resolveTelegramAttachments(args: {
    botToken: string;
    message: TelegramMessage;
}): Promise<RuntimeAttachment[]> {
    const attachments: RuntimeAttachment[] = [];

    const selectedPhoto = pickLargestTelegramPhoto(args.message.photo ?? []);
    if (selectedPhoto) {
        attachments.push(await downloadRuntimeAttachment({
            botToken: args.botToken,
            fileId: selectedPhoto.file_id,
            mimeType: "image/jpeg",
            filename: `telegram-photo-${args.message.message_id}.jpg`,
        }));
    }

    if (args.message.document) {
        const document = args.message.document;
        const mimeType = document.mime_type?.trim() || guessMimeTypeFromFilename(document.file_name);
        const extension = defaultExtensionForMimeType(mimeType);
        const filename = document.file_name?.trim()
            ? document.file_name.trim().slice(0, 180)
            : `telegram-document-${args.message.message_id}${extension}`;

        attachments.push(await downloadRuntimeAttachment({
            botToken: args.botToken,
            fileId: document.file_id,
            mimeType,
            filename,
        }));
    }

    if (attachments.length === 0) {
        return [];
    }
    if (attachments.length > AI_ATTACHMENT_MAX_FILES) {
        throw new Error(`Puoi inviare al massimo ${AI_ATTACHMENT_MAX_FILES} allegati per messaggio`);
    }

    const totalBytes = attachments.reduce((sum, attachment) => sum + attachment.size, 0);
    if (totalBytes > AI_ATTACHMENT_MAX_TOTAL_BYTES) {
        throw new Error(`Gli allegati superano ${formatBytes(AI_ATTACHMENT_MAX_TOTAL_BYTES)} complessivi`);
    }

    return attachments;
}

async function runTelegramAssistant(args: {
    connection: TelegramConnection;
    prompt: string;
    attachments?: RuntimeAttachment[];
}) {
    try {
        return await runAssistantTurn({
            userId: args.connection.userId,
            threadId: args.connection.currentThreadId,
            channel: "telegram",
            prompt: args.prompt,
            attachments: args.attachments,
            canWrite: true,
        });
    } catch (error) {
        if ((error as Error).message.includes("Thread non trovato")) {
            return runAssistantTurn({
                userId: args.connection.userId,
                channel: "telegram",
                prompt: args.prompt,
                attachments: args.attachments,
                canWrite: true,
            });
        }
        throw error;
    }
}

async function sendAssistantTurnToTelegram(args: {
    connection: TelegramConnection;
    botToken: string;
    chatId: string;
    result: Awaited<ReturnType<typeof runAssistantTurn>>;
}): Promise<void> {
    await setTelegramCurrentThread(args.connection.id, args.result.thread.id);
    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: args.chatId,
        text: args.result.assistantMessage.content,
    });

    for (const action of args.result.pendingActions) {
        await sendTelegramMessage({
            botToken: args.botToken,
            chatId: args.chatId,
            text: `${action.title}\n\n${action.previewText}`,
            replyMarkup: buildPendingActionKeyboard(action),
        });
    }
}

async function handleStartCommand(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
    startCode: string;
}) {
    const from = args.message.from;
    if (!from) return;

    if (
        args.startCode
        && args.connection.linkCode === args.startCode
        && args.connection.linkCodeExpiresAt
        && args.connection.linkCodeExpiresAt.getTime() > Date.now()
    ) {
        await linkTelegramUser({
            connectionId: args.connection.id,
            telegramUserId: String(from.id),
            telegramChatId: String(args.message.chat.id),
            telegramUsername: from.username ?? null,
        });

        await sendTelegramMessage({
            botToken: args.botToken,
            chatId: String(args.message.chat.id),
            text: [
                "Collegamento completato.",
                "",
                "Ora puoi chiedermi analisi sul tuo patrimonio, simulazioni mutuo/FIRE e anche operazioni scrivibili con conferma esplicita.",
                "",
                "Scrivi /help per vedere i comandi o mandami direttamente una domanda.",
            ].join("\n"),
        });
        return;
    }

    if (isAuthorizedTelegramUser(args.connection, from)) {
        await sendTelegramMessage({
            botToken: args.botToken,
            chatId: String(args.message.chat.id),
            text: "Bot gia' collegato. Scrivimi pure una domanda oppure usa /new per ripartire con un nuovo thread Telegram.",
        });
        return;
    }

    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text: "Codice di collegamento non valido o scaduto. Torna nella tab AI, aggiorna lo stato del bot e usa di nuovo il link personale.",
    });
}

async function handleStatusCommand(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    const currentThread = args.connection.currentThreadId
        ? await prisma.assistantThread.findFirst({
            where: { id: args.connection.currentThreadId, userId: args.connection.userId },
            select: { title: true },
        })
        : null;

    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text: [
            `Bot: @${args.connection.botUsername ?? "sconosciuto"}`,
            `Stato link: ${args.connection.linkStatus}`,
            `Utente collegato: ${args.connection.telegramUsername ? `@${args.connection.telegramUsername}` : "senza username"}`,
            `Thread attivo: ${currentThread?.title ?? "nessuno (verra' creato al prossimo messaggio)"}`,
        ].join("\n"),
    });
}

async function handleNewThreadCommand(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    const thread = await prisma.assistantThread.create({
        data: {
            userId: args.connection.userId,
            channel: "telegram",
            title: "Nuova conversazione Telegram",
        },
        select: {
            id: true,
            title: true,
        },
    });

    await setTelegramCurrentThread(args.connection.id, thread.id);
    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text: `Nuovo thread Telegram creato: ${thread.title}. Puoi continuare da qui.`,
    });
}

async function handleUnlinkCommand(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    await unlinkTelegramUser(args.connection.id);
    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text: "Bot scollegato. Per ricollegarlo apri di nuovo il link personale dalla tab AI.",
    });
}

async function handleExpenseCommand(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
    note: string;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    if (!hasTelegramMedia(args.message)) {
        const thread = await ensureTelegramThread(args.connection);
        await appendTelegramAssistantNote({
            threadId: thread.id,
            content: EXPENSE_CAPTURE_ARM_MESSAGE,
        });
        await setTelegramCurrentThread(args.connection.id, thread.id);
        await sendTelegramMessage({
            botToken: args.botToken,
            chatId: String(args.message.chat.id),
            text: EXPENSE_CAPTURE_ARM_MESSAGE,
        });
        return;
    }

    await handleExpenseCapture({
        connection: args.connection,
        botToken: args.botToken,
        message: args.message,
        note: args.note,
    });
}

async function handleExpenseCapture(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
    note: string;
}) {
    const attachments = await resolveTelegramAttachments({
        botToken: args.botToken,
        message: args.message,
    });
    if (attachments.length === 0) {
        await sendTelegramMessage({
            botToken: args.botToken,
            chatId: String(args.message.chat.id),
            text: "Non ho trovato allegati leggibili. Inviami uno screenshot o un PDF del conto/scontrino.",
        });
        return;
    }

    if (args.message.media_group_id) {
        for (const [index, attachment] of attachments.entries()) {
            await queueTelegramMediaGroupItem({
                connectionId: args.connection.id,
                mediaGroupId: args.message.media_group_id,
                note: args.note,
                item: {
                    telegramMessageId: `${args.message.message_id}:${index}`,
                    kind: attachment.kind,
                    mimeType: attachment.mimeType,
                    filename: attachment.filename,
                    size: attachment.size,
                    data: attachment.data,
                    sortOrder: args.message.message_id * 10 + index,
                },
            });
        }

        const mediaGroup = await waitForSettledTelegramMediaGroup({
            connectionId: args.connection.id,
            mediaGroupId: args.message.media_group_id,
        });
        if (!mediaGroup) {
            return;
        }

        if (mediaGroup.items.length > AI_ATTACHMENT_MAX_FILES) {
            await markTelegramMediaGroupFailed(mediaGroup.id);
            await sendTelegramMessage({
                botToken: args.botToken,
                chatId: String(args.message.chat.id),
                text: `Ho ricevuto ${mediaGroup.items.length} allegati nello stesso album, ma per ora posso analizzarne al massimo ${AI_ATTACHMENT_MAX_FILES} insieme. Rimandameli in piu' gruppi oppure usa un PDF unico.`,
            });
            return;
        }

        const totalBytes = mediaGroup.items.reduce((sum, item) => sum + item.size, 0);
        if (totalBytes > AI_ATTACHMENT_MAX_TOTAL_BYTES) {
            await markTelegramMediaGroupFailed(mediaGroup.id);
            await sendTelegramMessage({
                botToken: args.botToken,
                chatId: String(args.message.chat.id),
                text: `L'album supera ${formatBytes(AI_ATTACHMENT_MAX_TOTAL_BYTES)} complessivi. Prova con meno screenshot o con un PDF piu' compatto.`,
            });
            return;
        }

        try {
            const result = await runTelegramAssistant({
                connection: args.connection,
                prompt: buildExpenseCapturePrompt(mediaGroup.note),
                attachments: mediaGroup.items.map((item) => ({
                    kind: item.kind,
                    mimeType: item.mimeType,
                    filename: item.filename,
                    size: item.size,
                    data: item.data,
                })),
            });

            await sendAssistantTurnToTelegram({
                connection: args.connection,
                botToken: args.botToken,
                chatId: String(args.message.chat.id),
                result,
            });
            await markTelegramMediaGroupProcessed(mediaGroup.id);
            return;
        } catch (error) {
            await markTelegramMediaGroupFailed(mediaGroup.id);
            throw error;
        }
    }

    const result = await runTelegramAssistant({
        connection: args.connection,
        prompt: buildExpenseCapturePrompt(args.note),
        attachments,
    });

    await sendAssistantTurnToTelegram({
        connection: args.connection,
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        result,
    });
}

async function handleRecentExpensesCommand(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
    limit: number;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    const transactions = await listRecentBudgetTransactions({
        userId: args.connection.userId,
        limit: args.limit,
    });
    const text = transactions.length === 0
        ? "Non trovo ancora spese salvate nel budget."
        : [
            `Ultime ${transactions.length} transazioni:`,
            ...transactions.map((transaction) =>
                `- ${transaction.date} | ${transaction.description} | ${formatSignedEuro(transaction.amount)} | ${transaction.category}`
            ),
        ].join("\n");

    await replyWithTelegramThreadNote({
        connection: args.connection,
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text,
    });
}

async function handleUndoLatestImportCommand(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    const rolledBack = await rollbackLatestBudgetImportBatch({
        userId: args.connection.userId,
        channel: "telegram",
    });
    const text = rolledBack
        ? `Import annullato: ${rolledBack.title}. Ho rimosso ${rolledBack.deletedCount} transazioni.`
        : "Non trovo un import Telegram recente da annullare.";

    await replyWithTelegramThreadNote({
        connection: args.connection,
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text,
    });
}

async function handleCategoriesCommand(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    const { categories, rules } = await listBudgetCategoriesAndRules(args.connection.userId);
    const text = [
        categories.length > 0
            ? `Categorie budget (${categories.length}):\n${categories.slice(0, 20).map((category) => `- ${category.name}`).join("\n")}`
            : "Categorie budget: nessuna categoria personalizzata trovata.",
        "",
        rules.length > 0
            ? `Regole merchant (${Math.min(rules.length, 12)} mostrate):\n${rules.slice(0, 12).map((rule) =>
                `- ${rule.displayName} | ${rule.mode === "ignore" ? "ignora" : rule.category ?? "Altro"} | usi ${rule.hits}`
            ).join("\n")}`
            : "Regole merchant: nessuna regola salvata.",
    ].join("\n");

    await replyWithTelegramThreadNote({
        connection: args.connection,
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text,
    });
}

async function handleRecategorizeCommand(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
    month: string;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    if (args.month && !isValidBudgetMonth(args.month)) {
        await sendTelegramMessage({
            botToken: args.botToken,
            chatId: String(args.message.chat.id),
            text: "Formato mese non valido. Usa /ricategorizza oppure /ricategorizza YYYY-MM",
        });
        return;
    }

    const result = await reapplyBudgetRules({
        userId: args.connection.userId,
        month: args.month || undefined,
    });
    const text = args.month
        ? `Ricategorizzazione completata per ${args.month}: aggiornate ${result.updated} transazioni.`
        : `Ricategorizzazione completata: aggiornate ${result.updated} transazioni recenti.`;

    await replyWithTelegramThreadNote({
        connection: args.connection,
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text,
    });
}

async function handleTelegramPrompt(args: {
    connection: TelegramConnection;
    botToken: string;
    message: TelegramMessage;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    const prompt = getMessageText(args.message);
    if (!prompt) {
        await sendTelegramMessage({
            botToken: args.botToken,
            chatId: String(args.message.chat.id),
            text: "Per ora sugli allegati Telegram uso il flusso /spesa. Invia lo screenshot con didascalia /spesa oppure scrivi /spesa e poi manda il file.",
        });
        return;
    }

    const result = await runTelegramAssistant({
        connection: args.connection,
        prompt,
    });

    await sendAssistantTurnToTelegram({
        connection: args.connection,
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        result,
    });
}

async function handleCallbackQuery(args: {
    connection: TelegramConnection;
    botToken: string;
    callbackQuery: TelegramCallbackQuery;
}) {
    if (!isAuthorizedTelegramUser(args.connection, args.callbackQuery.from)) {
        await answerTelegramCallbackQuery({
            botToken: args.botToken,
            callbackQueryId: args.callbackQuery.id,
            text: "Utente non autorizzato",
        });
        return;
    }

    const [mode, actionId] = (args.callbackQuery.data ?? "").split(":");
    if (!actionId || (mode !== "confirm" && mode !== "cancel")) {
        await answerTelegramCallbackQuery({
            botToken: args.botToken,
            callbackQueryId: args.callbackQuery.id,
            text: "Azione non riconosciuta",
        });
        return;
    }

    const result = mode === "confirm"
        ? await confirmPendingAction({ actionId, userId: args.connection.userId })
        : await cancelPendingAction({ actionId, userId: args.connection.userId });

    await setTelegramCurrentThread(args.connection.id, result.threadId);
    await answerTelegramCallbackQuery({
        botToken: args.botToken,
        callbackQueryId: args.callbackQuery.id,
        text: result.summary,
    });

    if (args.callbackQuery.message) {
        await clearTelegramInlineKeyboard({
            botToken: args.botToken,
            chatId: String(args.callbackQuery.message.chat.id),
            messageId: args.callbackQuery.message.message_id,
        }).catch(() => undefined);
    }

    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: args.connection.telegramChatId ?? String(args.callbackQuery.message?.chat.id ?? ""),
        text: result.summary,
    });
}

export async function POST(req: Request, ctx: { params: Promise<{ connectionId: string }> }) {
    const { connectionId } = await ctx.params;
    const connection = await getTelegramConnectionForWebhook(connectionId);
    if (!connection) {
        return NextResponse.json({ ok: false }, { status: 404 });
    }

    const secret = req.headers.get("x-telegram-bot-api-secret-token");
    if (!secret || secret !== connection.webhookSecret) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const botToken = decryptTelegramBotToken(connection);
    let update: TelegramUpdate | null = null;

    try {
        update = await req.json() as TelegramUpdate;
        await setTelegramWebhookError(connection.id, null);

        if (update.callback_query) {
            await handleCallbackQuery({
                connection,
                botToken,
                callbackQuery: update.callback_query,
            });
            return NextResponse.json({ ok: true });
        }

        const message = update.message;
        if (!message || message.chat.type !== "private") {
            return NextResponse.json({ ok: true });
        }

        const messageText = getMessageText(message);
        const command = messageText ? parseCommand(messageText) : null;

        if (command?.command === "/start") {
            await handleStartCommand({
                connection,
                botToken,
                message,
                startCode: command.args,
            });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/help") {
            await sendTelegramMessage({
                botToken,
                chatId: String(message.chat.id),
                text: HELP_TEXT,
            });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/new") {
            await handleNewThreadCommand({ connection, botToken, message });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/status") {
            await handleStatusCommand({ connection, botToken, message });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/spesa") {
            await handleExpenseCommand({
                connection,
                botToken,
                message,
                note: command.args,
            });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/ultimespese") {
            await handleRecentExpensesCommand({
                connection,
                botToken,
                message,
                limit: parseRecentExpensesLimit(command.args),
            });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/annullaultimoimport") {
            await handleUndoLatestImportCommand({ connection, botToken, message });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/categorie") {
            await handleCategoriesCommand({ connection, botToken, message });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/ricategorizza") {
            await handleRecategorizeCommand({
                connection,
                botToken,
                message,
                month: command.args,
            });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/unlink") {
            await handleUnlinkCommand({ connection, botToken, message });
            return NextResponse.json({ ok: true });
        }

        if (hasTelegramMedia(message)) {
            if (!isAuthorizedTelegramUser(connection, message.from)) {
                await sendUnauthorizedMessage(botToken, String(message.chat.id));
                return NextResponse.json({ ok: true });
            }

            if (await isExpenseCaptureArmed(connection)) {
                await handleExpenseCapture({
                    connection,
                    botToken,
                    message,
                    note: messageText,
                });
            } else {
                await sendTelegramMessage({
                    botToken,
                    chatId: String(message.chat.id),
                    text: "Per importare spese da immagini usa /spesa nella didascalia del file oppure scrivi /spesa e poi mandami lo screenshot o il PDF.",
                });
            }
            return NextResponse.json({ ok: true });
        }

        await handleTelegramPrompt({ connection, botToken, message });
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("POST /api/telegram/webhook/[connectionId] error:", error);
        await setTelegramWebhookError(connection.id, (error as Error).message || "Errore webhook Telegram").catch(() => undefined);

        try {
            const chatId = update?.message?.chat?.id ?? update?.callback_query?.message?.chat?.id;
            if (chatId) {
                await sendTelegramMessage({
                    botToken,
                    chatId: String(chatId),
                    text: `Errore Telegram: ${(error as Error).message}`,
                }).catch(() => undefined);
            }
        } catch {
            /* noop */
        }

        return NextResponse.json({ ok: true });
    }
}
