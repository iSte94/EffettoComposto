import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderTelegramHtml } from "@/lib/telegram-format";

vi.mock("@/lib/prisma", () => ({
    default: {},
}));

import { sendTelegramMessage, splitTelegramMessage } from "@/lib/telegram";

describe("splitTelegramMessage", () => {
    it("genera chunk che restano sotto il limite anche dopo il rendering HTML", () => {
        const text = Array.from({ length: 2200 }, () => "&>").join("");

        const chunks = splitTelegramMessage(text);

        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every((chunk) => renderTelegramHtml(chunk).length <= 3800)).toBe(true);
    });

    it("evita di spezzare un blocco codice quando puo' farlo prima della fence", () => {
        const intro = Array.from({ length: 520 }, (_, index) => `Riga introduttiva ${index + 1}`).join("\n");
        const code = `\`\`\`ts\n${"const x = 1;\n".repeat(180)}\`\`\``;
        const chunks = splitTelegramMessage(`${intro}\n${code}`);

        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks[0]).not.toContain("```");
        expect(chunks.some((chunk, index) => index > 0 && chunk.startsWith("```"))).toBe(true);
    });
});

describe("sendTelegramMessage", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("ritenta in plain text se Telegram rifiuta l'HTML renderizzato", async () => {
        const fetchMock = vi.mocked(fetch)
            .mockResolvedValueOnce(new Response(JSON.stringify({
                ok: false,
                description: "Bad Request: can't parse entities: Unsupported start tag",
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                ok: true,
                result: { message_id: 1 },
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }));

        await sendTelegramMessage({
            botToken: "bot-token",
            chatId: "123",
            text: "**Ciao** <mondo>",
        });

        const firstPayload = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as Record<string, unknown>;
        const secondPayload = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string) as Record<string, unknown>;

        expect(firstPayload.parse_mode).toBe("HTML");
        expect(firstPayload.text).toBe("<b>Ciao</b> &lt;mondo&gt;");
        expect(secondPayload.parse_mode).toBeUndefined();
        expect(secondPayload.text).toBe("**Ciao** <mondo>");
    });

    it("mantiene la tastiera inline solo sull'ultimo chunk", async () => {
        const fetchMock = vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({
            ok: true,
            result: { message_id: 1 },
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }));

        const replyMarkup = {
            inline_keyboard: [[{ text: "Conferma", callback_data: "confirm:1" }]],
        };

        await sendTelegramMessage({
            botToken: "bot-token",
            chatId: "123",
            text: Array.from({ length: 5000 }, (_, index) => `Riga ${index + 1}`).join("\n"),
            replyMarkup,
        });

        expect(fetchMock.mock.calls.length).toBeGreaterThan(1);

        const payloads = fetchMock.mock.calls.map((call) =>
            JSON.parse(call[1]!.body as string) as Record<string, unknown>
        );

        payloads.slice(0, -1).forEach((payload) => {
            expect(payload.reply_markup).toBeUndefined();
        });
        expect(payloads.at(-1)?.reply_markup).toEqual(replyMarkup);
    });
});
