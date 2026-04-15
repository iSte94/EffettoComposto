"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bot, ChevronDown, ChevronRight, Loader2, RefreshCw, Send, Settings, Sparkles, Trash2, User, UserCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiSettingsModal } from "@/components/ai-settings-modal";
import { AiUserProfileModal } from "@/components/ai-user-profile-modal";
import { useAiSettings } from "@/hooks/useAiSettings";
import { useAiUserProfile } from "@/hooks/useAiUserProfile";
import { chat, type AiToolTraceEntry } from "@/lib/ai/providers";
import { AI_TOOLS } from "@/lib/ai/tools";
import {
    appendTurn,
    clearSessionMessages,
    getSessionState,
    setSessionTurns,
    setSessionUserData,
    subscribeSessionState,
    turnsToMessages,
    type ChatTurn,
} from "@/lib/ai/session-memory";

interface Props {
    user: { username: string } | null;
}

const SYSTEM_PROMPT_BASE = `Sei un consulente finanziario personale esperto, integrato nella piattaforma "Effetto Composto" — un cruscotto in italiano per pianificare l'indipendenza finanziaria (FIRE), gestire patrimonio, mutui, investimenti e budget.

REGOLE:
- Rispondi SEMPRE in italiano, con tono chiaro, diretto e pragmatico.
- Hai accesso a strumenti (function calling): USALI quando servono calcoli precisi (Monte Carlo FIRE, ammortamento mutuo, IRPEF/netto, prezzi live azioni/BTC, offerte mutui market, delta patrimonio tra due date). Non stimare a parole ciò che puoi calcolare con un tool.
- Basa ogni consiglio sui dati reali dell'utente forniti qui sotto (JSON esportato dalla piattaforma) e sui risultati dei tool che chiami.
- Il blocco "derived" contiene aggregati pronti (timeline patrimonio, deltas MoM/YoY/YTD, asset allocation, FIRE quick-check, saving rate). Usalo invece di scorrere a mano la lista snapshot.
- Tieni conto del PROFILO UTENTE (eta', lavoro, situazione, obiettivi, tolleranza al rischio) per personalizzare ogni consiglio.
- Se mancano dati utili alla risposta, dillo esplicitamente e indica all'utente quale sezione della piattaforma compilare (Patrimonio, FIRE, Budget, Obiettivi, "Parlami di te" per il profilo personale).
- Non inventare cifre o assunzioni non supportate dai dati o dai tool.
- Formatta con paragrafi brevi ed elenchi quando utile.
- Le risposte sono indicazioni informative, non consulenza fiscale/legale vincolante.
`;

function buildSystemPrompt(userProfile: string, dataJson: string): string {
    const profileBlock = userProfile.trim()
        ? `\n--- PROFILO UTENTE (testo libero scritto dall'utente in "Parlami di te") ---\n${userProfile.trim()}\n`
        : `\n--- PROFILO UTENTE ---\n(L'utente non ha ancora compilato la sezione "Parlami di te". Se serve contesto su eta'/lavoro/obiettivi, suggerisci di compilarla.)\n`;
    return `${SYSTEM_PROMPT_BASE}${profileBlock}\n--- DATI UTENTE (snapshot JSON esportato dalla piattaforma) ---\n${dataJson}`;
}

const EXAMPLE_PROMPTS = [
    "Analizza il mio FIRE number: sono sulla buona strada?",
    "Quanto è cresciuto il mio patrimonio nell'ultimo anno?",
    "Simula un Monte Carlo FIRE per i prossimi 20 anni",
    "Confronta le migliori offerte mutuo a tasso fisso 30 anni",
];

function ToolTrace({ entries }: { entries: AiToolTraceEntry[] }) {
    const [open, setOpen] = useState(false);
    if (entries.length === 0) return null;
    return (
        <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-2 px-3 py-1.5 font-medium text-purple-700 dark:text-purple-300"
            >
                {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                <Wrench className="size-3" />
                {entries.length} {entries.length === 1 ? "strumento usato" : "strumenti usati"}
            </button>
            {open && (
                <div className="space-y-2 border-t border-purple-500/20 px-3 py-2">
                    {entries.map((e, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                                <code className="rounded bg-purple-500/10 px-1 py-0.5 font-mono">
                                    {e.name}
                                </code>
                                <span className="text-muted-foreground">{e.durationMs}ms</span>
                            </div>
                            {Object.keys(e.args).length > 0 && (
                                <details className="pl-4">
                                    <summary className="cursor-pointer text-muted-foreground">args</summary>
                                    <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-muted-foreground">
                                        {JSON.stringify(e.args, null, 2)}
                                    </pre>
                                </details>
                            )}
                            <details className="pl-4">
                                <summary className="cursor-pointer text-muted-foreground">risultato</summary>
                                <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[10px] text-muted-foreground">
                                    {JSON.stringify(e.result, null, 2).slice(0, 2000)}
                                </pre>
                            </details>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function AiDashboard({ user }: Props) {
    const { settings, loaded } = useAiSettings();
    const { profile: userProfile } = useAiUserProfile();
    const session = useSyncExternalStore(subscribeSessionState, getSessionState, getSessionState);
    const { turns, userDataJson, dataBytes } = session;
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [pendingTools, setPendingTools] = useState<AiToolTraceEntry[]>([]);
    const endRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const refreshUserData = useCallback(async (): Promise<string | null> => {
        if (!user) return null;
        setDataLoading(true);
        try {
            const res = await fetch("/api/user-data?ai=1");
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
    }, [turns, sending, pendingTools]);

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

        const userTurn: ChatTurn = { message: { role: "user", content: prompt } };
        const nextTurns = [...turns, userTurn];
        setSessionTurns(nextTurns);
        setInput("");
        setSending(true);
        setPendingTools([]);

        try {
            const reply = await chat({
                provider: settings.provider,
                apiKey: settings.apiKey,
                model: settings.model,
                systemPrompt: buildSystemPrompt(userProfile, contextJson),
                messages: turnsToMessages(nextTurns),
                tools: AI_TOOLS,
                onToolCall: (entry) => {
                    setPendingTools((prev) => [...prev, entry]);
                },
            });
            appendTurn({
                message: { role: "assistant", content: reply.text || "(nessuna risposta)" },
                tools: reply.toolTrace.length > 0 ? reply.toolTrace : undefined,
            });
        } catch (e) {
            toast.error(`Errore AI: ${(e as Error).message.slice(0, 200)}`);
        } finally {
            setSending(false);
            setPendingTools([]);
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
                            messaggio include automaticamente il tuo profilo personale (&quot;Parlami di
                            te&quot;), uno snapshot aggiornato dei dati (con aggregati derivati: timeline
                            patrimonio, deltas, asset allocation, FIRE check, saving rate) e l&apos;AI
                            può chiamare strumenti per calcoli precisi (Monte Carlo, ammortamento,
                            prezzi live, offerte mutui).
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <AiUserProfileModal
                            open={profileOpen}
                            onOpenChange={setProfileOpen}
                            trigger={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    title="Scrivi cosa l'AI deve sapere di te (eta', lavoro, obiettivi). Allegato a ogni messaggio."
                                >
                                    <UserCircle2 className="size-4 mr-1" />
                                    Parlami di te
                                </Button>
                            }
                        />
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
                        {turns.length > 0 && (
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
                            {userDataJson ? `${(dataBytes / 1024).toFixed(1)} KB` : "vuoto"}
                        </span>
                        <span className="opacity-60">•</span>
                        <span>
                            <strong>Tools:</strong> {AI_TOOLS.length} disponibili
                        </span>
                        <span className="opacity-60">•</span>
                        <span>
                            <strong>Profilo:</strong>{" "}
                            {userProfile.trim() ? (
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen(true)}
                                    className="underline hover:text-foreground"
                                >
                                    compilato ({userProfile.length} car.)
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen(true)}
                                    className="underline hover:text-foreground"
                                >
                                    vuoto — clicca per compilare
                                </button>
                            )}
                        </span>
                    </div>

                    <div className="min-h-[28rem] space-y-3 rounded-2xl border border-border/60 bg-background/60 p-3">
                        {turns.length === 0 && !sending && (
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

                        {turns.map((t, i) => (
                            <div
                                key={i}
                                className={`flex gap-2 ${t.message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {t.message.role === "assistant" && (
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                                        <Bot className="size-4 text-purple-500" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] ${t.message.role === "user" ? "" : "w-full"}`}>
                                    <div
                                        className={`whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                                            t.message.role === "user"
                                                ? "bg-blue-600 text-white"
                                                : "bg-muted text-foreground"
                                        }`}
                                    >
                                        {t.message.content}
                                    </div>
                                    {t.tools && t.tools.length > 0 && <ToolTrace entries={t.tools} />}
                                </div>
                                {t.message.role === "user" && (
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
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
                                        <Loader2 className="size-4 animate-spin" />
                                        {pendingTools.length > 0
                                            ? `Eseguo strumenti (${pendingTools.length})...`
                                            : "Sto pensando..."}
                                    </div>
                                    {pendingTools.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {pendingTools.map((t, i) => (
                                                <span
                                                    key={i}
                                                    className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-mono text-purple-700 dark:text-purple-300"
                                                >
                                                    {t.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
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
