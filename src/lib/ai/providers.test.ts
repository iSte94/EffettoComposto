import { extractGeminiVisibleText, geminiSanitizeSchema } from "@/lib/ai/providers";

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
