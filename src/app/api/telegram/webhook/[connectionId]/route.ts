import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runAssistantTurn } from "@/lib/ai/runtime";
import { cancelPendingAction, confirmPendingAction } from "@/lib/ai/pending-actions";
import {
    answerTelegramCallbackQuery,
    buildPendingActionKeyboard,
    clearTelegramInlineKeyboard,
    decryptTelegramBotToken,
    getTelegramConnectionForWebhook,
    linkTelegramUser,
    sendTelegramMessage,
    setTelegramCurrentThread,
    setTelegramWebhookError,
    unlinkTelegramUser,
} from "@/lib/telegram";

interface TelegramUser {
    id: number;
    username?: string;
}

interface TelegramChat {
    id: number;
    type: string;
}

interface TelegramMessage {
    message_id: number;
    text?: string;
    chat: TelegramChat;
    from?: TelegramUser;
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

const HELP_TEXT = [
    "Comandi disponibili:",
    "/start <codice> collega il bot al tuo account",
    "/help mostra questo riepilogo",
    "/new apre una nuova conversazione Telegram",
    "/status mostra stato link e thread attivo",
    "/unlink scollega il bot dal tuo account",
    "",
    "Dopo il collegamento puoi scrivere in linguaggio naturale, chiedere simulazioni e confermare le azioni direttamente dai pulsanti.",
].join("\n");

function parseCommand(text: string): { command: string; args: string } | null {
    if (!text.startsWith("/")) return null;
    const [rawCommand, ...rest] = text.trim().split(/\s+/);
    return {
        command: rawCommand.toLowerCase().replace(/@\w+$/, ""),
        args: rest.join(" ").trim(),
    };
}

function isAuthorizedTelegramUser(connection: Awaited<ReturnType<typeof getTelegramConnectionForWebhook>>, from?: TelegramUser): boolean {
    return !!connection
        && connection.linkStatus === "linked"
        && !!from
        && connection.telegramUserId === String(from.id);
}

async function sendUnauthorizedMessage(botToken: string, chatId: string): Promise<void> {
    await sendTelegramMessage({
        botToken,
        chatId,
        text: "Questo bot non e' collegato a te. Apri la tab AI di Effetto Composto e usa il deep link personale per completare /start <codice>.",
    });
}

async function handleStartCommand(args: {
    connectionId: string;
    botToken: string;
    message: TelegramMessage;
    startCode: string;
}) {
    const connection = await getTelegramConnectionForWebhook(args.connectionId);
    if (!connection) return;

    const from = args.message.from;
    if (!from) return;

    if (
        args.startCode
        && connection.linkCode === args.startCode
        && connection.linkCodeExpiresAt
        && connection.linkCodeExpiresAt.getTime() > Date.now()
    ) {
        await linkTelegramUser({
            connectionId: connection.id,
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

    if (isAuthorizedTelegramUser(connection, from)) {
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
    connectionId: string;
    botToken: string;
    message: TelegramMessage;
}) {
    const connection = await getTelegramConnectionForWebhook(args.connectionId);
    if (!connection) return;

    if (!isAuthorizedTelegramUser(connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    const currentThread = connection.currentThreadId
        ? await prisma.assistantThread.findFirst({
            where: { id: connection.currentThreadId, userId: connection.userId },
            select: { title: true },
        })
        : null;

    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text: [
            `Bot: @${connection.botUsername ?? "sconosciuto"}`,
            `Stato link: ${connection.linkStatus}`,
            `Utente collegato: ${connection.telegramUsername ? `@${connection.telegramUsername}` : "senza username"}`,
            `Thread attivo: ${currentThread?.title ?? "nessuno (verra' creato al prossimo messaggio)"}`,
        ].join("\n"),
    });
}

async function handleNewThreadCommand(args: {
    connectionId: string;
    botToken: string;
    message: TelegramMessage;
}) {
    const connection = await getTelegramConnectionForWebhook(args.connectionId);
    if (!connection) return;

    if (!isAuthorizedTelegramUser(connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    const thread = await prisma.assistantThread.create({
        data: {
            userId: connection.userId,
            channel: "telegram",
            title: "Nuova conversazione Telegram",
        },
        select: {
            id: true,
            title: true,
        },
    });

    await setTelegramCurrentThread(connection.id, thread.id);
    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text: `Nuovo thread Telegram creato: ${thread.title}. Puoi continuare da qui.`,
    });
}

async function handleUnlinkCommand(args: {
    connectionId: string;
    botToken: string;
    message: TelegramMessage;
}) {
    const connection = await getTelegramConnectionForWebhook(args.connectionId);
    if (!connection) return;

    if (!isAuthorizedTelegramUser(connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    await unlinkTelegramUser(connection.id);
    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text: "Bot scollegato. Per ricollegarlo apri di nuovo il link personale dalla tab AI.",
    });
}

async function handleTelegramPrompt(args: {
    connectionId: string;
    botToken: string;
    message: TelegramMessage;
}) {
    const connection = await getTelegramConnectionForWebhook(args.connectionId);
    if (!connection) return;

    if (!isAuthorizedTelegramUser(connection, args.message.from)) {
        await sendUnauthorizedMessage(args.botToken, String(args.message.chat.id));
        return;
    }

    const prompt = args.message.text?.trim();
    if (!prompt) {
        await sendTelegramMessage({
            botToken: args.botToken,
            chatId: String(args.message.chat.id),
            text: "In questa prima versione gestisco solo messaggi testuali e pulsanti di conferma.",
        });
        return;
    }

    let result;
    try {
        result = await runAssistantTurn({
            userId: connection.userId,
            threadId: connection.currentThreadId,
            channel: "telegram",
            prompt,
            canWrite: true,
        });
    } catch (error) {
        if ((error as Error).message.includes("Thread non trovato")) {
            result = await runAssistantTurn({
                userId: connection.userId,
                channel: "telegram",
                prompt,
                canWrite: true,
            });
        } else {
            throw error;
        }
    }

    await setTelegramCurrentThread(connection.id, result.thread.id);
    await sendTelegramMessage({
        botToken: args.botToken,
        chatId: String(args.message.chat.id),
        text: result.assistantMessage.content,
    });

    for (const action of result.pendingActions) {
        await sendTelegramMessage({
            botToken: args.botToken,
            chatId: String(args.message.chat.id),
            text: `${action.title}\n\n${action.previewText}`,
            replyMarkup: buildPendingActionKeyboard(action),
        });
    }
}

async function handleCallbackQuery(args: {
    connectionId: string;
    botToken: string;
    callbackQuery: TelegramCallbackQuery;
}) {
    const connection = await getTelegramConnectionForWebhook(args.connectionId);
    if (!connection) return;

    if (!isAuthorizedTelegramUser(connection, args.callbackQuery.from)) {
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
        ? await confirmPendingAction({ actionId, userId: connection.userId })
        : await cancelPendingAction({ actionId, userId: connection.userId });

    await setTelegramCurrentThread(connection.id, result.threadId);
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
        chatId: connection.telegramChatId ?? String(args.callbackQuery.message?.chat.id ?? ""),
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
                connectionId,
                botToken,
                callbackQuery: update.callback_query,
            });
            return NextResponse.json({ ok: true });
        }

        const message = update.message;
        if (!message || message.chat.type !== "private") {
            return NextResponse.json({ ok: true });
        }

        const command = message.text ? parseCommand(message.text) : null;
        if (command?.command === "/start") {
            await handleStartCommand({
                connectionId,
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
            await handleNewThreadCommand({ connectionId, botToken, message });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/status") {
            await handleStatusCommand({ connectionId, botToken, message });
            return NextResponse.json({ ok: true });
        }
        if (command?.command === "/unlink") {
            await handleUnlinkCommand({ connectionId, botToken, message });
            return NextResponse.json({ ok: true });
        }

        await handleTelegramPrompt({ connectionId, botToken, message });
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
