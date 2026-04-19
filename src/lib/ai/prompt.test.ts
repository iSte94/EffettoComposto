import { describe, expect, it } from "vitest";
import { buildAssistantSystemPrompt } from "@/lib/ai/prompt";

describe("buildAssistantSystemPrompt", () => {
    it("aggiunge regole specifiche per Telegram", () => {
        const prompt = buildAssistantSystemPrompt("", '{"derived":{}}', [], "telegram");

        expect(prompt).toContain("REGOLE CANALE TELEGRAM");
        expect(prompt).toContain("simulate_fire_scenario");
        expect(prompt).toContain("mini-quadro numerico");
        expect(prompt).toContain("target FIRE, capitale considerato oggi, gap residuo");
        expect(prompt).toContain("Non dire che un obiettivo e' realistico");
    });

    it("mantiene istruzioni separate per il canale web", () => {
        const prompt = buildAssistantSystemPrompt("", '{"derived":{}}', [], "web");

        expect(prompt).toContain("REGOLE CANALE WEB");
        expect(prompt).not.toContain("REGOLE CANALE TELEGRAM");
    });
});
