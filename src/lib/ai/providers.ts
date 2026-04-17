import {
    AI_ATTACHMENT_MAX_REQUEST_BYTES,
    formatBytes,
    type AiAttachmentInput,
} from "@/lib/ai/attachments";
import type { AiToolDef } from "@/lib/ai/tools";

export type AiProvider = "openrouter" | "gemini";

export interface AiChatMessage {
    role: "user" | "assistant";
    content: string;
    attachments?: AiAttachmentInput[];
}

export interface AiToolTraceEntry {
    name: string;
    args: Record<string, unknown>;
    result: unknown;
    durationMs: number;
}

export interface AiChatRequest {
    provider: AiProvider;
    apiKey: string;
    model: string;
    systemPrompt: string;
    messages: AiChatMessage[];
    tools?: AiToolDef[];
    onToolCall?: (entry: AiToolTraceEntry) => void;
    maxToolRoundtrips?: number;
}

export interface AiChatResult {
    text: string;
    toolTrace: AiToolTraceEntry[];
}

export interface AiModel {
    id: string;
    name: string;
}

const DEFAULT_MAX_TOOL_ROUNDTRIPS = 6;

export async function listModels(provider: AiProvider, apiKey: string): Promise<AiModel[]> {
    if (provider === "openrouter") {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
        const json = await res.json();
        type Row = { id: string; name?: string };
        return ((json.data ?? []) as Row[])
            .map((m) => ({ id: m.id, name: m.name ?? m.id }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const json = await res.json();
    type Row = { name: string; displayName?: string; supportedGenerationMethods?: string[] };
    return ((json.models ?? []) as Row[])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => ({
            id: m.name.replace(/^models\//, ""),
            name: m.displayName ?? m.name,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function chat(req: AiChatRequest): Promise<AiChatResult> {
    const totalAttachmentBytes = req.messages.reduce(
        (sum, message) => sum + (message.attachments ?? []).reduce((messageSum, attachment) => messageSum + attachment.size, 0),
        0,
    );
    if (totalAttachmentBytes > AI_ATTACHMENT_MAX_REQUEST_BYTES) {
        throw new Error(
            `Gli allegati della conversazione superano ${formatBytes(AI_ATTACHMENT_MAX_REQUEST_BYTES)}. Apri un nuovo thread o riduci i file.`,
        );
    }
    return req.provider === "openrouter" ? chatOpenRouter(req) : chatGemini(req);
}

// =================== OpenRouter (formato OpenAI) ===================

interface OpenAiTextPart {
    type: "text";
    text: string;
}

interface OpenAiImagePart {
    type: "image_url";
    image_url: { url: string };
}

interface OpenAiFilePart {
    type: "file";
    file: {
        filename: string;
        file_data: string;
    };
}

type OpenAiContentPart = OpenAiTextPart | OpenAiImagePart | OpenAiFilePart;

interface OpenAiToolCall {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
}

interface OpenAiMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string | OpenAiContentPart[] | null;
    name?: string;
    tool_calls?: OpenAiToolCall[];
    tool_call_id?: string;
}

function buildOpenAiContent(message: AiChatMessage): string | OpenAiContentPart[] {
    const parts: OpenAiContentPart[] = [];
    if (message.content.trim()) {
        parts.push({ type: "text", text: message.content });
    }
    for (const attachment of message.attachments ?? []) {
        if (attachment.kind === "image") {
            parts.push({
                type: "image_url",
                image_url: { url: attachment.dataUrl },
            });
        } else {
            parts.push({
                type: "file",
                file: {
                    filename: attachment.filename,
                    file_data: attachment.dataUrl,
                },
            });
        }
    }
    if (parts.length === 0) return message.content;
    if (parts.length === 1 && parts[0].type === "text") return parts[0].text;
    return parts;
}

async function chatOpenRouter(req: AiChatRequest): Promise<AiChatResult> {
    const trace: AiToolTraceEntry[] = [];
    const tools = (req.tools ?? []).map((t) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    const conversation: OpenAiMessage[] = [
        { role: "system", content: req.systemPrompt },
        ...req.messages.map((m): OpenAiMessage => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: buildOpenAiContent(m),
        })),
    ];

    const maxRounds = req.maxToolRoundtrips ?? DEFAULT_MAX_TOOL_ROUNDTRIPS;
    for (let round = 0; round <= maxRounds; round++) {
        const body: Record<string, unknown> = {
            model: req.model,
            messages: conversation,
        };
        if (tools.length > 0) body.tools = tools;

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${req.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
                "X-Title": "Effetto Composto",
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
        const json = await res.json();
        const choice = json.choices?.[0];
        const msg = choice?.message as OpenAiMessage | undefined;
        if (!msg) throw new Error("OpenRouter: nessuna risposta");

        const toolCalls = msg.tool_calls ?? [];
        if (toolCalls.length === 0 || tools.length === 0 || round === maxRounds) {
            return { text: typeof msg.content === "string" ? msg.content : "", toolTrace: trace };
        }

        // Append assistant message preserving tool_calls (richiesto dal protocollo)
        conversation.push({
            role: "assistant",
            content: typeof msg.content === "string" ? msg.content : "",
            tool_calls: toolCalls,
        });

        for (const call of toolCalls) {
            const tool = req.tools?.find((t) => t.name === call.function.name);
            let parsedArgs: Record<string, unknown> = {};
            try { parsedArgs = JSON.parse(call.function.arguments || "{}"); } catch { /* noop */ }

            const t0 = performance.now();
            let result: unknown;
            if (!tool) {
                result = { error: `Tool sconosciuto: ${call.function.name}` };
            } else {
                try { result = await tool.handler(parsedArgs); }
                catch (e) { result = { error: (e as Error).message }; }
            }
            const entry: AiToolTraceEntry = {
                name: call.function.name,
                args: parsedArgs,
                result,
                durationMs: Math.round(performance.now() - t0),
            };
            trace.push(entry);
            req.onToolCall?.(entry);

            conversation.push({
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify(result),
            });
        }
    }
    return { text: "", toolTrace: trace };
}

// =================== Gemini (formato Google) ===================

interface GeminiPart {
    text?: string;
    inlineData?: { mimeType: string; data: string };
    thought?: boolean;
    thoughtSignature?: string;
    functionCall?: { name: string; args?: Record<string, unknown> };
    functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
    role: "user" | "model";
    parts: GeminiPart[];
}

/**
 * Gemini accetta gli enum solo come stringhe; per gli enum numerici convertiamo
 * sia i valori sia il type, lasciando invariato lo schema usato dagli altri provider.
 */
export function geminiSanitizeSchema(schema: Record<string, unknown>): Record<string, unknown> {
    const hasNonStringEnum = Array.isArray(schema.enum)
        && schema.enum.some((value) => typeof value !== "string");
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(schema)) {
        if (k === "enum" && Array.isArray(v)) {
            out[k] = v.map((x) => String(x));
        } else if (k === "type" && hasNonStringEnum) {
            out[k] = "string";
        } else if (k === "default" && hasNonStringEnum && v !== undefined) {
            out[k] = String(v);
        } else if (Array.isArray(v)) {
            out[k] = v.map((item) => (
                item && typeof item === "object"
                    ? geminiSanitizeSchema(item as Record<string, unknown>)
                    : item
            ));
        } else if (v && typeof v === "object" && !Array.isArray(v)) {
            out[k] = geminiSanitizeSchema(v as Record<string, unknown>);
        } else {
            out[k] = v;
        }
    }
    return out;
}

export function extractGeminiVisibleText(parts: GeminiPart[]): string {
    return parts
        .filter((part) => typeof part.text === "string" && !part.thought)
        .map((part) => part.text ?? "")
        .join("");
}

function extractDataUrlBase64(dataUrl: string): string {
    const marker = ";base64,";
    const markerIndex = dataUrl.indexOf(marker);
    return markerIndex >= 0 ? dataUrl.slice(markerIndex + marker.length) : dataUrl;
}

function buildGeminiParts(message: AiChatMessage): GeminiPart[] {
    const parts: GeminiPart[] = [];
    if (message.content.trim()) {
        parts.push({ text: message.content });
    }
    for (const attachment of message.attachments ?? []) {
        parts.push({
            inlineData: {
                mimeType: attachment.mimeType,
                data: extractDataUrlBase64(attachment.dataUrl),
            },
        });
    }
    return parts.length > 0 ? parts : [{ text: message.content }];
}

async function chatGemini(req: AiChatRequest): Promise<AiChatResult> {
    const trace: AiToolTraceEntry[] = [];

    const conversation: GeminiContent[] = req.messages.map((m): GeminiContent => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: buildGeminiParts(m),
    }));

    const toolsDecl = (req.tools ?? []).length > 0
        ? [{ functionDeclarations: req.tools!.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: geminiSanitizeSchema(t.parameters),
            })) }]
        : undefined;

    const maxRounds = req.maxToolRoundtrips ?? DEFAULT_MAX_TOOL_ROUNDTRIPS;
    for (let round = 0; round <= maxRounds; round++) {
        const body: Record<string, unknown> = {
            systemInstruction: { parts: [{ text: req.systemPrompt }] },
            contents: conversation,
        };
        if (toolsDecl) body.tools = toolsDecl;

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent`,
            {
                method: "POST",
                headers: {
                    "x-goog-api-key": req.apiKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            },
        );
        if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
        const json = await res.json();

        const candidate = json.candidates?.[0];
        const parts: GeminiPart[] = candidate?.content?.parts ?? [];
        const functionCalls = parts.filter((p): p is GeminiPart & { functionCall: NonNullable<GeminiPart["functionCall"]> } => !!p.functionCall);

        if (functionCalls.length === 0 || !toolsDecl || round === maxRounds) {
            const text = extractGeminiVisibleText(parts);
            return { text, toolTrace: trace };
        }

        // Append model turn (con functionCall) e poi le functionResponse
        conversation.push({ role: "model", parts });

        const responseParts: GeminiPart[] = [];
        for (const call of functionCalls) {
            const name = call.functionCall.name;
            const args = call.functionCall.args ?? {};
            const tool = req.tools?.find((t) => t.name === name);
            const t0 = performance.now();
            let result: unknown;
            if (!tool) {
                result = { error: `Tool sconosciuto: ${name}` };
            } else {
                try { result = await tool.handler(args); }
                catch (e) { result = { error: (e as Error).message }; }
            }
            const entry: AiToolTraceEntry = {
                name,
                args,
                result,
                durationMs: Math.round(performance.now() - t0),
            };
            trace.push(entry);
            req.onToolCall?.(entry);

            responseParts.push({
                functionResponse: {
                    name,
                    response: typeof result === "object" && result !== null
                        ? (result as Record<string, unknown>)
                        : { value: result },
                },
            });
        }
        conversation.push({ role: "user", parts: responseParts });
    }
    return { text: "", toolTrace: trace };
}
