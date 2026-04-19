import { afterEach, describe, expect, it, vi } from "vitest";
import { chat, extractGeminiVisibleText, geminiSanitizeSchema } from "@/lib/ai/providers";

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("geminiSanitizeSchema", () => {
    it("converte gli enum numerici in stringhe compatibili con Gemini", () => {
        const schema = {
            type: "object",
            properties: {
                mensilita: {
                    type: "integer",
                    description: "Numero di mensilita'",
                    enum: [12, 13, 14],
                    default: 14,
                },
                durata: {
                    type: "integer",
                    enum: [15, 20, 30],
                },
                contractType: {
                    type: "string",
                    enum: ["standard", "over15"],
                },
            },
            required: ["mensilita"],
        };

        const sanitized = geminiSanitizeSchema(schema);

        expect(sanitized).toEqual({
            type: "object",
            properties: {
                mensilita: {
                    type: "string",
                    description: "Numero di mensilita'",
                    enum: ["12", "13", "14"],
                    default: "14",
                },
                durata: {
                    type: "string",
                    enum: ["15", "20", "30"],
                },
                contractType: {
                    type: "string",
                    enum: ["standard", "over15"],
                },
            },
            required: ["mensilita"],
        });

        expect(schema.properties.mensilita.type).toBe("integer");
        expect(schema.properties.mensilita.enum).toEqual([12, 13, 14]);
    });
});

describe("extractGeminiVisibleText", () => {
    it("nasconde i thought summaries e lascia solo la risposta finale", () => {
        const visible = extractGeminiVisibleText([
            {
                text: `"ciaociao" (informal greeting). The user is greeting the assistant.`,
                thought: true,
                thoughtSignature: "sig-1",
            },
            {
                text: "Ciao! Come posso aiutarti oggi con la tua pianificazione finanziaria?",
            },
        ]);

        expect(visible).toBe("Ciao! Come posso aiutarti oggi con la tua pianificazione finanziaria?");
    });
});

describe("chat Gemini", () => {
    it("ritenta automaticamente sui 500 transitori", async () => {
        vi.useFakeTimers();

        const fetchMock = vi.fn<typeof fetch>()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                error: { message: "Internal error encountered." },
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                candidates: [
                    {
                        content: {
                            parts: [{ text: "Risposta finale" }],
                        },
                    },
                ],
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }));

        vi.stubGlobal("fetch", fetchMock);

        const promise = chat({
            provider: "gemini",
            apiKey: "test-key",
            model: "gemini-test",
            systemPrompt: "System",
            messages: [{ role: "user", content: "Ciao" }],
        });

        await vi.advanceTimersByTimeAsync(700);
        const result = await promise;

        expect(result.text).toBe("Risposta finale");
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
