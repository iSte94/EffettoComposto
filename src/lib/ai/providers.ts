export type AiProvider = "openrouter" | "gemini";

export interface AiChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface AiChatRequest {
    provider: AiProvider;
    apiKey: string;
    model: string;
    systemPrompt: string;
    messages: AiChatMessage[];
}

export interface AiModel {
    id: string;
    name: string;
}

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

export async function chat(req: AiChatRequest): Promise<string> {
    return req.provider === "openrouter" ? chatOpenRouter(req) : chatGemini(req);
}

async function chatOpenRouter(req: AiChatRequest): Promise<string> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${req.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
            "X-Title": "Effetto Composto",
        },
        body: JSON.stringify({
            model: req.model,
            messages: [
                { role: "system", content: req.systemPrompt },
                ...req.messages.map((m) => ({
                    role: m.role === "assistant" ? "assistant" : "user",
                    content: m.content,
                })),
            ],
        }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
}

async function chatGemini(req: AiChatRequest): Promise<string> {
    const contents = req.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent`,
        {
            method: "POST",
            headers: {
                "x-goog-api-key": req.apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: req.systemPrompt }] },
                contents,
            }),
        },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const json = await res.json();
    type Part = { text?: string };
    const parts: Part[] = json.candidates?.[0]?.content?.parts ?? [];
    return parts.map((p) => p.text ?? "").join("");
}
