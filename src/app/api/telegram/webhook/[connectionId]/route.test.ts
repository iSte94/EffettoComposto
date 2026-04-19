import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    prisma: {
        assistantThread: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        assistantMessage: {
            create: vi.fn(),
            findFirst: vi.fn(),
        },
    },
    runtime: {
        runAssistantTurn: vi.fn(),
    },
    pendingActions: {
        confirmPendingAction: vi.fn(),
        cancelPendingAction: vi.fn(),
    },
    budgetAssistant: {
        listBudgetCategoriesAndRules: vi.fn(),
        listRecentBudgetTransactions: vi.fn(),
        reapplyBudgetRules: vi.fn(),
        rollbackLatestBudgetImportBatch: vi.fn(),
    },
    telegram: {
        answerTelegramCallbackQuery: vi.fn(),
        buildPendingActionKeyboard: vi.fn((action: { id: string }) => ({
            inline_keyboard: [[{ text: "Conferma", callback_data: `confirm:${action.id}` }]],
        })),
        clearTelegramInlineKeyboard: vi.fn(),
        decryptTelegramBotToken: vi.fn(() => "bot-token"),
        downloadTelegramFile: vi.fn(),
        getTelegramConnectionForWebhook: vi.fn(),
        getTelegramFileMetadata: vi.fn(),
        linkTelegramUser: vi.fn(),
        sendTelegramMessage: vi.fn(),
        setTelegramCurrentThread: vi.fn(),
        setTelegramWebhookError: vi.fn(),
        unlinkTelegramUser: vi.fn(),
    },
    attachments: {
        AI_ATTACHMENT_MAX_FILES: 4,
        AI_ATTACHMENT_MAX_TOTAL_BYTES: 10_000_000,
        formatBytes: vi.fn((value: number) => `${value} B`),
        getAiAttachmentKind: vi.fn(() => "image"),
        validateAiAttachmentMeta: vi.fn(() => null),
    },
    mediaGroups: {
        markTelegramMediaGroupFailed: vi.fn(),
        markTelegramMediaGroupProcessed: vi.fn(),
        queueTelegramMediaGroupItem: vi.fn(),
        waitForSettledTelegramMediaGroup: vi.fn(),
    },
}));

vi.mock("@/lib/prisma", () => ({
    default: mocks.prisma,
}));

vi.mock("@/lib/ai/runtime", () => ({
    runAssistantTurn: mocks.runtime.runAssistantTurn,
}));

vi.mock("@/lib/ai/pending-actions", () => ({
    confirmPendingAction: mocks.pendingActions.confirmPendingAction,
    cancelPendingAction: mocks.pendingActions.cancelPendingAction,
}));

vi.mock("@/lib/budget-assistant", () => ({
    listBudgetCategoriesAndRules: mocks.budgetAssistant.listBudgetCategoriesAndRules,
    listRecentBudgetTransactions: mocks.budgetAssistant.listRecentBudgetTransactions,
    reapplyBudgetRules: mocks.budgetAssistant.reapplyBudgetRules,
    rollbackLatestBudgetImportBatch: mocks.budgetAssistant.rollbackLatestBudgetImportBatch,
}));

vi.mock("@/lib/telegram", () => ({
    answerTelegramCallbackQuery: mocks.telegram.answerTelegramCallbackQuery,
    buildPendingActionKeyboard: mocks.telegram.buildPendingActionKeyboard,
    clearTelegramInlineKeyboard: mocks.telegram.clearTelegramInlineKeyboard,
    decryptTelegramBotToken: mocks.telegram.decryptTelegramBotToken,
    downloadTelegramFile: mocks.telegram.downloadTelegramFile,
    getTelegramConnectionForWebhook: mocks.telegram.getTelegramConnectionForWebhook,
    getTelegramFileMetadata: mocks.telegram.getTelegramFileMetadata,
    linkTelegramUser: mocks.telegram.linkTelegramUser,
    sendTelegramMessage: mocks.telegram.sendTelegramMessage,
    setTelegramCurrentThread: mocks.telegram.setTelegramCurrentThread,
    setTelegramWebhookError: mocks.telegram.setTelegramWebhookError,
    unlinkTelegramUser: mocks.telegram.unlinkTelegramUser,
}));

vi.mock("@/lib/ai/attachments", () => ({
    AI_ATTACHMENT_MAX_FILES: mocks.attachments.AI_ATTACHMENT_MAX_FILES,
    AI_ATTACHMENT_MAX_TOTAL_BYTES: mocks.attachments.AI_ATTACHMENT_MAX_TOTAL_BYTES,
    formatBytes: mocks.attachments.formatBytes,
    getAiAttachmentKind: mocks.attachments.getAiAttachmentKind,
    validateAiAttachmentMeta: mocks.attachments.validateAiAttachmentMeta,
}));

vi.mock("@/lib/telegram-media-groups", () => ({
    markTelegramMediaGroupFailed: mocks.mediaGroups.markTelegramMediaGroupFailed,
    markTelegramMediaGroupProcessed: mocks.mediaGroups.markTelegramMediaGroupProcessed,
    queueTelegramMediaGroupItem: mocks.mediaGroups.queueTelegramMediaGroupItem,
    waitForSettledTelegramMediaGroup: mocks.mediaGroups.waitForSettledTelegramMediaGroup,
}));

import { POST } from "./route";

function createConnection(overrides: Record<string, unknown> = {}) {
    const now = new Date();
    return {
        id: "conn-1",
        userId: "user-1",
        botTokenEnc: "enc-token",
        botId: "42",
        botUsername: "effettocomposto_bot",
        botFirstName: "Effetto composto",
        webhookSecret: "secret-123",
        botStatus: "linked",
        linkStatus: "linked",
        linkCode: "abc123",
        linkCodeExpiresAt: new Date(now.getTime() + 60_000),
        telegramUserId: "999",
        telegramChatId: "777",
        telegramUsername: "theralus",
        linkedAt: now,
        currentThreadId: "thread-0",
        lastWebhookAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function createRequest(body: unknown, secret = "secret-123") {
    return new Request("http://localhost/api/telegram/webhook/conn-1", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-telegram-bot-api-secret-token": secret,
        },
        body: JSON.stringify(body),
    });
}

async function readJson(response: Response) {
    return response.json() as Promise<Record<string, unknown>>;
}

describe("POST /api/telegram/webhook/[connectionId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.telegram.sendTelegramMessage.mockResolvedValue(undefined);
        mocks.telegram.answerTelegramCallbackQuery.mockResolvedValue(undefined);
        mocks.telegram.clearTelegramInlineKeyboard.mockResolvedValue(undefined);
        mocks.telegram.setTelegramCurrentThread.mockResolvedValue(undefined);
        mocks.telegram.setTelegramWebhookError.mockResolvedValue(undefined);
        mocks.telegram.linkTelegramUser.mockResolvedValue(undefined);
        mocks.telegram.unlinkTelegramUser.mockResolvedValue(undefined);
        mocks.telegram.getTelegramFileMetadata.mockResolvedValue({
            file_id: "file-1",
            file_path: "photos/1.jpg",
        });
        mocks.telegram.downloadTelegramFile.mockResolvedValue(new Uint8Array([1, 2, 3]));

        mocks.prisma.assistantThread.findFirst.mockResolvedValue(null);
        mocks.prisma.assistantThread.create.mockResolvedValue({
            id: "thread-1",
            title: "Nuova conversazione Telegram",
        });
        mocks.prisma.assistantThread.update.mockResolvedValue(undefined);
        mocks.prisma.assistantMessage.create.mockResolvedValue(undefined);
        mocks.prisma.assistantMessage.findFirst.mockResolvedValue(null);

        mocks.runtime.runAssistantTurn.mockResolvedValue({
            thread: {
                id: "thread-0",
                title: "Thread Telegram",
                channel: "telegram",
                createdAt: "2026-04-19T10:00:00.000Z",
                updatedAt: "2026-04-19T10:00:00.000Z",
                messageCount: 2,
            },
            assistantMessage: {
                id: "msg-1",
                role: "assistant",
                content: "Risposta assistant",
                toolTrace: null,
                attachments: [],
                pendingActions: [],
                createdAt: "2026-04-19T10:00:00.000Z",
            },
            pendingActions: [],
        });

        mocks.pendingActions.confirmPendingAction.mockResolvedValue({
            summary: "Operazione confermata",
            threadId: "thread-2",
        });
        mocks.pendingActions.cancelPendingAction.mockResolvedValue({
            summary: "Operazione annullata",
            threadId: "thread-2",
        });
    });

    it("collega l'utente Telegram con /start valido", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection({
            linkStatus: "pending",
            telegramUserId: null,
            telegramChatId: null,
            telegramUsername: null,
            currentThreadId: null,
        }));

        const response = await POST(createRequest({
            message: {
                message_id: 1,
                text: "/start abc123",
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.telegram.linkTelegramUser).toHaveBeenCalledWith({
            connectionId: "conn-1",
            telegramUserId: "999",
            telegramChatId: "777",
            telegramUsername: "theralus",
        });
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenCalledWith(expect.objectContaining({
            botToken: "bot-token",
            chatId: "777",
            text: expect.stringContaining("Collegamento completato."),
        }));
    });

    it("arma la modalita' /spesa quando il comando arriva senza allegati", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection({
            currentThreadId: null,
        }));

        const response = await POST(createRequest({
            message: {
                message_id: 2,
                text: "/spesa bollette aprile",
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.prisma.assistantThread.create).toHaveBeenCalled();
        expect(mocks.prisma.assistantMessage.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                threadId: "thread-1",
                role: "assistant",
                content: expect.stringContaining("Modalita /spesa attiva."),
            }),
        });
        expect(mocks.prisma.assistantMessage.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                content: expect.stringContaining("Nota import salvata: bollette aprile"),
            }),
        });
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining("Mandami ora uno screenshot o un PDF"),
        }));
    });

    it("riusa la nota salvata con /spesa quando il file arriva nel messaggio successivo", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection({
            currentThreadId: "thread-armed",
        }));
        mocks.prisma.assistantMessage.findFirst.mockResolvedValue({
            role: "assistant",
            content: [
                "Modalita /spesa attiva. Mandami ora uno screenshot o un PDF (estratto conto, app banca, scontrino).",
                "Leggero' le transazioni visibili, le categorizzero', ti mostrero' cosa ho capito e salvero' tutto solo dopo il tuo ok.",
                "",
                "Nota import salvata: bollette aprile",
            ].join("\n"),
            createdAt: new Date(),
        });

        const response = await POST(createRequest({
            message: {
                message_id: 21,
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
                photo: [
                    { file_id: "only", width: 1200, height: 1600, file_size: 5000 },
                ],
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.runtime.runAssistantTurn).toHaveBeenCalledWith(expect.objectContaining({
            prompt: expect.stringContaining("Nota aggiuntiva dell'utente: bollette aprile"),
        }));
    });

    it("processa uno screenshot spese quando la modalita' /spesa e' armata", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection({
            currentThreadId: "thread-armed",
        }));
        mocks.prisma.assistantMessage.findFirst.mockResolvedValue({
            role: "assistant",
            content: "Modalita /spesa attiva. Attendo il file.",
            createdAt: new Date(),
        });
        mocks.runtime.runAssistantTurn.mockResolvedValue({
            thread: {
                id: "thread-armed",
                title: "Import spese",
                channel: "telegram",
                createdAt: "2026-04-19T10:00:00.000Z",
                updatedAt: "2026-04-19T10:00:00.000Z",
                messageCount: 3,
            },
            assistantMessage: {
                id: "msg-2",
                role: "assistant",
                content: "Ho capito 2 spese da confermare.",
                toolTrace: null,
                attachments: [],
                pendingActions: [],
                createdAt: "2026-04-19T10:00:00.000Z",
            },
            pendingActions: [],
        });

        const response = await POST(createRequest({
            message: {
                message_id: 3,
                caption: "Esselunga e farmacia",
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
                photo: [
                    { file_id: "small", width: 300, height: 300, file_size: 1000 },
                    { file_id: "large", width: 1200, height: 1600, file_size: 5000 },
                ],
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.runtime.runAssistantTurn).toHaveBeenCalledWith(expect.objectContaining({
            userId: "user-1",
            threadId: "thread-armed",
            channel: "telegram",
            prompt: expect.stringContaining("Nota aggiuntiva dell'utente: Esselunga e farmacia"),
            attachments: [
                expect.objectContaining({
                    kind: "image",
                    filename: "telegram-photo-3.jpg",
                    size: 3,
                }),
            ],
        }));
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenCalledWith(expect.objectContaining({
            text: "Ho capito 2 spese da confermare.",
        }));
    });

    it("suggerisce /spesa se arriva un media fuori dal flusso import", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection({
            currentThreadId: "thread-plain",
        }));
        mocks.prisma.assistantMessage.findFirst.mockResolvedValue({
            role: "assistant",
            content: "Risposta normale del bot",
            createdAt: new Date(),
        });

        const response = await POST(createRequest({
            message: {
                message_id: 30,
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
                photo: [
                    { file_id: "large", width: 1200, height: 1600, file_size: 5000 },
                ],
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.runtime.runAssistantTurn).not.toHaveBeenCalled();
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining("Per importare spese da immagini usa /spesa"),
        }));
    });

    it("invia anche le pending actions con tastiera inline dopo la risposta assistant", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection());
        mocks.runtime.runAssistantTurn.mockResolvedValue({
            thread: {
                id: "thread-0",
                title: "Thread Telegram",
                channel: "telegram",
                createdAt: "2026-04-19T10:00:00.000Z",
                updatedAt: "2026-04-19T10:00:00.000Z",
                messageCount: 2,
            },
            assistantMessage: {
                id: "msg-1",
                role: "assistant",
                content: "Ti preparo un import.",
                toolTrace: null,
                attachments: [],
                pendingActions: [],
                createdAt: "2026-04-19T10:00:00.000Z",
            },
            pendingActions: [
                {
                    id: "pa-1",
                    title: "Confermi import budget?",
                    previewText: "2 movimenti da salvare",
                },
            ],
        });

        const response = await POST(createRequest({
            message: {
                message_id: 31,
                text: "Registra queste spese",
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.telegram.buildPendingActionKeyboard).toHaveBeenCalledWith(expect.objectContaining({
            id: "pa-1",
        }));
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({
            text: expect.stringContaining("Confermi import budget?"),
            replyMarkup: expect.objectContaining({
                inline_keyboard: expect.any(Array),
            }),
        }));
    });

    it("valida /ricategorizza e non esegue se il mese non e' valido", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection());

        const response = await POST(createRequest({
            message: {
                message_id: 32,
                text: "/ricategorizza 2026-13",
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.budgetAssistant.reapplyBudgetRules).not.toHaveBeenCalled();
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining("Formato mese non valido"),
        }));
    });

    it("mostra /status e usa il thread esistente quando disponibile", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection({
            currentThreadId: "thread-status",
        }));
        mocks.prisma.assistantThread.findFirst.mockResolvedValue({
            title: "Piano FIRE 2026",
        });

        const response = await POST(createRequest({
            message: {
                message_id: 33,
                text: "/status",
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining("Thread attivo: Piano FIRE 2026"),
        }));
    });

    it("rifiuta i comandi da un utente Telegram non autorizzato", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection({
            telegramUserId: "123456",
        }));

        const response = await POST(createRequest({
            message: {
                message_id: 34,
                text: "/status",
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenCalledWith(expect.objectContaining({
            text: expect.stringContaining("Questo bot non e' collegato a te"),
        }));
    });

    it("gestisce la conferma via callback e pulisce la tastiera inline", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection());

        const response = await POST(createRequest({
            callback_query: {
                id: "cb-1",
                data: "confirm:action-1",
                from: { id: 999, username: "theralus" },
                message: {
                    message_id: 55,
                    chat: { id: 777, type: "private" },
                },
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.pendingActions.confirmPendingAction).toHaveBeenCalledWith({
            actionId: "action-1",
            userId: "user-1",
        });
        expect(mocks.telegram.answerTelegramCallbackQuery).toHaveBeenCalledWith({
            botToken: "bot-token",
            callbackQueryId: "cb-1",
            text: "Operazione confermata",
        });
        expect(mocks.telegram.clearTelegramInlineKeyboard).toHaveBeenCalledWith({
            botToken: "bot-token",
            chatId: "777",
            messageId: 55,
        });
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenCalledWith(expect.objectContaining({
            chatId: "777",
            text: "Operazione confermata",
        }));
    });

    it("mostra un errore user-friendly e non persiste i transienti Gemini", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection());
        mocks.runtime.runAssistantTurn.mockRejectedValue(new Error("Gemini 500: Internal error encountered."));

        const response = await POST(createRequest({
            message: {
                message_id: 4,
                text: "A che punto sono col FIRE?",
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
            },
        }), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(await readJson(response)).toEqual({ ok: true });
        expect(mocks.telegram.setTelegramWebhookError.mock.calls.at(-1)).toEqual(["conn-1", null]);
        expect(mocks.telegram.sendTelegramMessage).toHaveBeenCalledWith(expect.objectContaining({
            chatId: "777",
            text: expect.stringContaining("problema temporaneo"),
        }));
    });

    it("rifiuta il webhook se il secret non combacia", async () => {
        mocks.telegram.getTelegramConnectionForWebhook.mockResolvedValue(createConnection());

        const response = await POST(createRequest({
            message: {
                message_id: 5,
                text: "/help",
                chat: { id: 777, type: "private" },
                from: { id: 999, username: "theralus" },
            },
        }, "wrong-secret"), { params: Promise.resolve({ connectionId: "conn-1" }) });

        expect(response.status).toBe(401);
        expect(await readJson(response)).toEqual({ ok: false });
        expect(mocks.telegram.sendTelegramMessage).not.toHaveBeenCalled();
    });
});
