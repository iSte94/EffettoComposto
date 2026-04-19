const TELEGRAM_CODE_BLOCK_PLACEHOLDER = "@@TG_CODE_BLOCK_";

function escapeTelegramHtml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function normalizeTelegramTableLine(line: string): string {
    const trimmed = line.trim();
    if (!trimmed.includes("|")) return line;
    if (/^\|?[\s:|\-]+\|?$/u.test(trimmed)) return "";

    const cells = trimmed
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);

    return cells.length >= 2 ? cells.join(" | ") : line;
}

function applyInlineTelegramFormatting(text: string): string {
    return text
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gu, '<a href="$2">$1</a>')
        .replace(/`([^`\n]+)`/gu, "<code>$1</code>")
        .replace(/\*\*([^*\n]+)\*\*/gu, "<b>$1</b>")
        .replace(/__([^_\n]+)__/gu, "<b>$1</b>")
        .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,;:!?])/gmu, '$1<i>$2</i>')
        .replace(/~~([^~\n]+)~~/gu, "<s>$1</s>");
}

export function renderTelegramHtml(text: string): string {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
        return "(nessuna risposta)";
    }

    const codeBlocks: string[] = [];
    const withPlaceholders = normalized.replace(/```(?:[\w-]+)?\n?([\s\S]*?)```/gu, (_match, code: string) => {
        const index = codeBlocks.push(`<pre>${escapeTelegramHtml(code.trim())}</pre>`) - 1;
        return `${TELEGRAM_CODE_BLOCK_PLACEHOLDER}${index}@@`;
    });

    const escaped = escapeTelegramHtml(withPlaceholders);
    const formattedLines = escaped
        .split("\n")
        .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return "";
            if (trimmed.startsWith(TELEGRAM_CODE_BLOCK_PLACEHOLDER)) return trimmed;
            if (/^#{1,6}\s+/u.test(trimmed)) {
                return `<b>${trimmed.replace(/^#{1,6}\s+/u, "").trim()}</b>`;
            }
            if (/^\s*[-*]\s+/u.test(line)) {
                return line.replace(/^\s*[-*]\s+/u, "- ");
            }
            if (/^\s*>\s+/u.test(line)) {
                return line.replace(/^\s*>\s+/u, "> ");
            }
            return normalizeTelegramTableLine(line);
        })
        .join("\n");

    const withInlineFormatting = applyInlineTelegramFormatting(formattedLines);

    return codeBlocks.reduce(
        (output, block, index) => output.replace(`${TELEGRAM_CODE_BLOCK_PLACEHOLDER}${index}@@`, block),
        withInlineFormatting,
    );
}

function extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }
    if (typeof error === "string" && error.trim()) {
        return error.trim();
    }
    return "Errore interno";
}

export function isTransientTelegramProviderError(error: unknown): boolean {
    const message = extractErrorMessage(error);
    return [
        /gemini\s+(429|500|502|503|504)\b/iu,
        /openrouter\s+(429|500|502|503|504)\b/iu,
        /internal error encountered/iu,
        /temporarily unavailable/iu,
        /deadline exceeded/iu,
        /service unavailable/iu,
        /overloaded/iu,
    ].some((pattern) => pattern.test(message));
}

export function shouldPersistTelegramError(error: unknown): boolean {
    return !isTransientTelegramProviderError(error);
}

export function buildTelegramUserFacingErrorMessage(error: unknown): string {
    const message = extractErrorMessage(error);

    if (isTransientTelegramProviderError(message)) {
        return "Il motore AI ha avuto un problema temporaneo. Non ho perso il contesto: riprova tra pochi secondi.";
    }

    if (/configura prima provider, api key e modello/iu.test(message)) {
        return "Prima devi configurare provider, modello e API key nella tab AI di Effetto Composto.";
    }

    if (
        /serve testo o almeno un allegato/iu.test(message)
        || /massimo \d+ allegati/iu.test(message)
        || /superano .* complessivi/iu.test(message)
        || /formato non supportato/iu.test(message)
        || /non ho trovato allegati leggibili/iu.test(message)
        || /formato mese non valido/iu.test(message)
    ) {
        return message;
    }

    return "C'e' stato un errore inatteso nel bot Telegram. Ho registrato il problema: riprova tra poco.";
}
