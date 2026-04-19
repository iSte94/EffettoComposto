import { describe, expect, it } from "vitest";
import {
    buildTelegramUserFacingErrorMessage,
    renderTelegramHtml,
    shouldPersistTelegramError,
} from "@/lib/telegram-format";

describe("renderTelegramHtml", () => {
    it("converte il markdown piu' comune in HTML compatibile con Telegram", () => {
        const input = [
            "### Stato FIRE",
            "",
            "* **Target:** 1.107.000 EUR",
            "* Link: [dettaglio](https://example.com/report)",
            "",
            "```ts",
            "const rate = 3.25;",
            "```",
        ].join("\n");

        const output = renderTelegramHtml(input);

        expect(output).toContain("<b>Stato FIRE</b>");
        expect(output).toContain('- <b>Target:</b> 1.107.000 EUR');
        expect(output).toContain('<a href="https://example.com/report">dettaglio</a>');
        expect(output).toContain("<pre>const rate = 3.25;</pre>");
    });
});

describe("buildTelegramUserFacingErrorMessage", () => {
    it("nasconde gli errori transienti del provider", () => {
        const output = buildTelegramUserFacingErrorMessage(new Error("Gemini 500: Internal error encountered."));

        expect(output).toContain("problema temporaneo");
        expect(shouldPersistTelegramError(new Error("Gemini 500: Internal error encountered."))).toBe(false);
    });

    it("mantiene visibili gli errori correggibili dall'utente", () => {
        const output = buildTelegramUserFacingErrorMessage(new Error("Formato mese non valido. Usa /ricategorizza YYYY-MM"));

        expect(output).toBe("Formato mese non valido. Usa /ricategorizza YYYY-MM");
        expect(shouldPersistTelegramError(new Error("Formato mese non valido. Usa /ricategorizza YYYY-MM"))).toBe(true);
    });
});
