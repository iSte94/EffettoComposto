"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bot, Loader2, RefreshCw, Send, Settings, Sparkles, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiSettingsModal } from "@/components/ai-settings-modal";
import { useAiSettings } from "@/hooks/useAiSettings";
import { chat, type AiChatMessage } from "@/lib/ai/providers";
import {
    clearSessionMessages,
    getSessionState,
    setSessionMessages,
    setSessionUserData,
    subscribeSessionState,
} from "@/lib/ai/session-memory";

interface Props {
    user: { username: string } | null;
}

const SYSTEM_PROMPT_PREAMBLE = `Sei un consulente finanziario personale esperto, integrato nella piattaforma "Effetto Composto" — un cruscotto in italiano per pianificare l'indipendenza finanziaria (FIRE), gestire patrimonio, mutui, investimenti e budget.

REGOLE:
- Rispondi SEMPRE in italiano, con tono chiaro, diretto e pragmatico.
- Basa ogni consiglio sui dati reali dell'utente forniti qui sotto (JSON esportato dalla piattaforma).
- Se mancano dati utili alla risposta, dillo esplicitamente e indica all'utente quale sezione della piattaforma compilare (Patrimonio, FIRE, Budget, Obiettivi, ecc.).
- Non inventare cifre o assunzioni non supportate dai dati.
- Formatta con paragrafi brevi ed elenchi quando utile.
- Le risposte sono indicazioni informative, non consulenza fiscale/legale vincolante.

--- DATI UTENTE (snapshot JSON esportato dalla piattaforma) ---
`;

const EXAMPLE_PROMPTS = [
    "Analizza il mio FIRE number: sono sulla buona strada?",
    "Come dovrei ribilanciare il mio portafoglio?",
    "Qual è il mio tasso di risparmio e come posso migliorarlo?",
    "Riesco a permettermi il mutuo che sto simulando?",
];

export function AiDashboard({ user }: Props) {
    const { settings, loaded } = useAiSettings();
    const session = useSyncExternalStore(subscribeSessionState, getSessionState, getSessionState);
    const { messages, userDataJson, dataBytes } = session;
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const refreshUserData = useCallback(async (): Promise<string | null> => {
        if (!user) return null;
        setDataLoading(true);
        try {
            const res = await fetch("/api/user-data");
            if (!res.ok) throw new Error("Impossibile caricare i dati");
            const data = await res.json();
            const json = JSON.stringify(data);
            setSessionUserData(json, new Blob([json]).size);
            return json;
        } catch (e) {
            toast.error((e as Error).message);
            return null;
        } finally {
            setDataLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && !getSessionState().userDataJson) {
            void refreshUserData();
        }
    }, [user, refreshUserData]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sending]);

    const isConfigured = loaded && !!settings.apiKey && !!settings.model;

    const send = async (text?: string) => {
        const prompt = (text ?? input).trim();
        if (!prompt || sending) return;
        if (!user) {
            toast.error("Accedi per usare l'AI Advisor");
            return;
        }
        if (!isConfigured) {
            toast.error("Configura prima provider, API key e modello");
            setSettingsOpen(true);
            return;
        }

        let contextJson = userDataJson;
        if (!contextJson) {
            contextJson = await refreshUserData();
            if (!contextJson) return;
        }

        const next: AiChatMessage[] = [...messages, { role: "user", content: prompt }];
        setSessionMessages(next);
        setInput("");
        setSending(true);

        try {
            const reply = await chat({
                provider: settings.provider,
                apiKey: settings.apiKey,
                model: settings.model,
                systemPrompt: SYSTEM_PROMPT_PREAMBLE + contextJson,
                messages: next,
            });
            setSessionMessages([...next, { role: "assistant", content: reply }]);
        } catch (e) {
            toast.error(`Errore AI: ${(e as Error).message.slice(0, 200)}`);
        } finally {
            setSending(false);
            textareaRef.current?.focus();
        }
    };

    const clearChat = () => {
        clearSessionMessages();
        toast.success("Conversazione cancellata");
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
        }
    };

    if (!user) {
        return (
            <Card className="rounded-3xl border-border/70 bg-card/80 backdrop-blur-xl">
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                    <Bot className="size-12 text-purple-500" />
                    <h3 className="text-lg font-semibold">Accedi per usare l&apos;AI Advisor</h3>
                    <p className="max-w-md text-sm text-muted-foreground">
                        L&apos;AI Advisor ha bisogno di accedere ai tuoi dati della piattaforma per
                        darti consigli personalizzati. Effettua il login per iniziare.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="rounded-3xl border-border/70 bg-card/80 backdrop-blur-xl">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="size-5 text-purple-500" />
                            AI Advisor
                        </CardTitle>
                        <CardDescription>
                            Chiedi consigli personalizzati basati sui dati della tua piattaforma. Ogni
                            messaggio include automaticamente uno snapshot aggiornato dei tuoi dati come
                            contesto per il modello.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void refreshUserData()}
                            disabled={dataLoading}
                            title="Ricarica i dati utente che verranno inviati come contesto"
                        >
                            <RefreshCw className={`size-4 mr-1 ${dataLoading ? "animate-spin" : ""}`} />
                            Aggiorna dati
                        </Button>
                        <AiSettingsModal
                            open={settingsOpen}
                            onOpenChange={setSettingsOpen}
                            trigger={
                                <Button variant="outline" size="sm">
                                    <Settings className="size-4 mr-1" />
                                    Config
                                </Button>
                            }
                        />
                        {messages.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearChat}>
                                <Trash2 className="size-4 mr-1" />
                                Pulisci
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        <span>
                            <strong>Provider:</strong>{" "}
                            {isConfigured
                                ? `${settings.provider === "gemini" ? "Gemini" : "OpenRouter"} · ${settings.model}`
                                : "non configurato"}
                        </span>
                        <span className="opacity-60">•</span>
                        <span>
                            <strong>Contesto:</strong>{" "}
                            {userDataJson ? `${(dataBytes / 1024).toFixed(1)} KB di dati` : "vuoto"}
                        </span>
                    </div>

                    <div className="min-h-[28rem] space-y-3 rounded-2xl border border-border/60 bg-background/60 p-3">
                        {messages.length === 0 && !sending && (
                            <div className="flex flex-col items-center gap-3 py-10 text-center">
                                <Sparkles className="size-10 text-purple-400" />
                                <p className="text-sm text-muted-foreground">
                                    Inizia la conversazione. Ecco qualche idea:
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {EXAMPLE_PROMPTS.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => void send(p)}
                                            className="rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {m.role === "assistant" && (
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                                        <Bot className="size-4 text-purple-500" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                                        m.role === "user"
                                            ? "bg-blue-600 text-white"
                                            : "bg-muted text-foreground"
                                    }`}
                                >
                                    {m.content}
                                </div>
                                {m.role === "user" && (
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                                        <User className="size-4 text-blue-500" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {sending && (
                            <div className="flex gap-2">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                                    <Bot className="size-4 text-purple-500" />
                                </div>
                                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
                                    <Loader2 className="size-4 animate-spin" />
                                    Sto pensando...
                                </div>
                            </div>
                        )}

                        <div ref={endRef} />
                    </div>

                    <div className="flex items-end gap-2">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder={
                                isConfigured
                                    ? "Scrivi la tua domanda... (Invio per inviare, Shift+Invio per nuova riga)"
                                    : "Configura provider e API key per iniziare"
                            }
                            rows={2}
                            disabled={!isConfigured || sending}
                            className="min-h-[3.5rem] flex-1 resize-none rounded-xl border border-border bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        />
                        <Button
                            onClick={() => void send()}
                            disabled={!input.trim() || sending || !isConfigured}
                            className="min-h-[3.5rem] bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {sending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
