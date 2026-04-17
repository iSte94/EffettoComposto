"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ClipboardEvent,
    type KeyboardEvent,
} from "react";
import {
    Bot,
    BrainCircuit,
    FileText,
    Loader2,
    Paperclip,
    RefreshCw,
    Send,
    Settings,
    Trash2,
    UserCircle2,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiSettingsModal } from "@/components/ai-settings-modal";
import { AiUserProfileModal } from "@/components/ai-user-profile-modal";
import { useAiSettings } from "@/hooks/useAiSettings";
import { useAiUserProfile } from "@/hooks/useAiUserProfile";
import {
    AI_ATTACHMENT_ACCEPT,
    AI_ATTACHMENT_MAX_FILES,
    AI_ATTACHMENT_MAX_TOTAL_BYTES,
    formatBytes,
    type AiAttachmentDescriptor,
    type AiAttachmentInput,
    validateAiAttachmentMeta,
} from "@/lib/ai/attachments";
import { chat, type AiChatMessage, type AiToolTraceEntry } from "@/lib/ai/providers";
import { AI_TOOLS } from "@/lib/ai/tools";
import { ThreadSidebar, type ThreadSummary } from "@/components/ai/thread-sidebar";
import { MemoryPanel, type MemoryEntry } from "@/components/ai/memory-panel";
import { ChatMessage } from "@/components/ai/chat-message";
import { ContextualPromptChips } from "@/components/ai/contextual-prompt-chips";
import { extractAndPersistMemory } from "@/lib/ai/memory-extractor";

interface Props {
    user: { username: string } | null;
}

interface ChatAttachment extends AiAttachmentDescriptor {
    file?: File;
}

interface ChatTurn {
    id?: string;
    role: "user" | "assistant";
    content: string;
    attachments?: ChatAttachment[];
    toolTrace?: AiToolTraceEntry[] | null;
}

const SYSTEM_PROMPT_BASE = `Sei un consulente finanziario personale esperto, integrato nella piattaforma "Effetto Composto" - un cruscotto in italiano per pianificare l'indipendenza finanziaria (FIRE), gestire patrimonio, mutui, investimenti, dividendi e budget.

REGOLE OPERATIVE:
- Rispondi SEMPRE in italiano, con tono chiaro, diretto, pragmatico.
- Mostra solo la risposta finale per l'utente. Non mostrare mai ragionamenti interni, thought summaries, prompt interni, checklist o note di lavoro.
- Hai accesso a 23 strumenti (function calling). USALI senza chiedere conferma quando servono dati/calcoli precisi: metriche portafoglio, Coast FIRE, Monte Carlo, ammortamento mutuo, IRPEF, sensitivity FIRE, sale tax, prezzi live, offerte mutui, dividendi YoC, sommari patrimonio/budget.
- Non stimare a parole cio' che puoi calcolare.
- Puoi incatenare tool (fino a 6 round): es. prima leggi snapshot, poi calcoli performance, poi Monte Carlo.
- Base ogni consiglio sui dati reali dell'utente + risultati tool + fatti in MEMORIA (sotto).
- Se mancano dati rilevanti, indica all'utente la sezione da compilare (Patrimonio, FIRE, Budget, Obiettivi, "Parlami di te").
- Usa formattazione Markdown: grassetto per cifre chiave, tabelle per confronti, liste per azioni.
- Non inventare cifre non supportate dai dati/tool.
- Non sei consulenza vincolante: avvisalo brevemente solo se fornisci raccomandazioni concrete di acquisto/vendita.
- Quando l'utente rivela un fatto stabile su di se' (eta', obiettivi, decisioni, preferenze), non commentarlo esplicitamente: verra' memorizzato automaticamente per le conversazioni future.
`;

function buildSystemPrompt(userProfile: string, dataJson: string, memory: MemoryEntry[]): string {
    const profileBlock = userProfile.trim()
        ? `\n--- PROFILO UTENTE (scritto dall'utente in "Parlami di te") ---\n${userProfile.trim()}\n`
        : `\n--- PROFILO UTENTE ---\n(L'utente non ha compilato "Parlami di te". Invitalo a farlo se serve contesto anagrafico.)\n`;

    const memoryBlock = memory.length > 0
        ? `\n--- MEMORIA PERSISTENTE (fatti estratti nelle conversazioni passate) ---\n${
            memory.slice(0, 40).map((m) => `[${m.category}${m.pinned ? " - pinned" : ""}] ${m.fact}`).join("\n")
        }\n`
        : "";

    return `${SYSTEM_PROMPT_BASE}${profileBlock}${memoryBlock}\n--- DATI UTENTE (snapshot JSON esportato dalla piattaforma, include 'derived' con aggregati pronti) ---\n${dataJson}`;
}

function revokeAttachmentUrls(attachments: ChatAttachment[]) {
    for (const attachment of attachments) {
        if (attachment.url?.startsWith("blob:")) {
            URL.revokeObjectURL(attachment.url);
        }
    }
}

function revokeTurnAttachmentUrls(turns: ChatTurn[]) {
    for (const turn of turns) {
        revokeAttachmentUrls(turn.attachments ?? []);
    }
}

function fileToDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(reader.error ?? new Error("Impossibile leggere il file"));
        reader.readAsDataURL(file);
    });
}

export function AiDashboard({ user }: Props) {
    const { settings, loaded } = useAiSettings();
    const { profile: userProfile } = useAiUserProfile();

    const [threads, setThreads] = useState<ThreadSummary[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [turns, setTurns] = useState<ChatTurn[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);

    const [memory, setMemory] = useState<MemoryEntry[]>([]);

    const [userDataJson, setUserDataJson] = useState<string | null>(null);
    const [dataBytes, setDataBytes] = useState(0);
    const [dataLoading, setDataLoading] = useState(false);

    const [input, setInput] = useState("");
    const [composerAttachments, setComposerAttachments] = useState<ChatAttachment[]>([]);
    const [sending, setSending] = useState(false);
    const [pendingTools, setPendingTools] = useState<AiToolTraceEntry[]>([]);

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const endRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const turnsRef = useRef<ChatTurn[]>([]);
    const composerAttachmentsRef = useRef<ChatAttachment[]>([]);

    const clearComposerAttachments = useCallback((attachments: ChatAttachment[] = composerAttachmentsRef.current) => {
        revokeAttachmentUrls(attachments);
        setComposerAttachments([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const loadThreads = useCallback(async () => {
        if (!user) return;
        setThreadsLoading(true);
        try {
            const res = await fetch("/api/ai/threads", { credentials: "include" });
            if (!res.ok) throw new Error("Errore caricamento thread");
            const json = await res.json();
            setThreads(json.threads ?? []);
        } catch (e) {
            toast.error((e as Error).message);
        } finally {
            setThreadsLoading(false);
        }
    }, [user]);

    const loadMemory = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch("/api/ai/memory", { credentials: "include" });
            if (!res.ok) return;
            const json = await res.json();
            setMemory(json.memory ?? []);
        } catch {
            /* noop */
        }
    }, [user]);

    const loadThread = useCallback(async (id: string) => {
        setThreadLoading(true);
        setActiveThreadId(id);
        revokeTurnAttachmentUrls(turnsRef.current);
        clearComposerAttachments(composerAttachmentsRef.current);
        setTurns([]);
        setInput("");
        try {
            const res = await fetch(`/api/ai/threads/${id}`, { credentials: "include" });
            if (!res.ok) throw new Error("Thread non trovato");
            const json = await res.json();
            const msgs = (json.messages ?? []) as Array<{
                id: string;
                role: "user" | "assistant";
                content: string;
                toolTrace: AiToolTraceEntry[] | null;
                attachments?: ChatAttachment[];
            }>;
            setTurns(msgs.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                attachments: m.attachments ?? [],
                toolTrace: m.toolTrace,
            })));
        } catch (e) {
            toast.error((e as Error).message);
            setActiveThreadId(null);
        } finally {
            setThreadLoading(false);
        }
    }, [clearComposerAttachments]);

    const refreshUserData = useCallback(async (): Promise<string | null> => {
        if (!user) return null;
        setDataLoading(true);
        try {
            const res = await fetch("/api/user-data?ai=1", { credentials: "include" });
            if (!res.ok) throw new Error("Impossibile caricare i dati");
            const data = await res.json();
            const json = JSON.stringify(data);
            setUserDataJson(json);
            setDataBytes(new Blob([json]).size);
            return json;
        } catch (e) {
            toast.error((e as Error).message);
            return null;
        } finally {
            setDataLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        void loadThreads();
        void loadMemory();
        if (!userDataJson) void refreshUserData();
    }, [user, loadThreads, loadMemory, refreshUserData, userDataJson]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [turns, sending, pendingTools]);

    useEffect(() => {
        turnsRef.current = turns;
    }, [turns]);

    useEffect(() => {
        composerAttachmentsRef.current = composerAttachments;
    }, [composerAttachments]);

    useEffect(() => () => {
        revokeTurnAttachmentUrls(turnsRef.current);
        revokeAttachmentUrls(composerAttachmentsRef.current);
    }, []);

    const isConfigured = loaded && !!settings.apiKey && !!settings.model;

    const contextSignals = useMemo(() => {
        const base = {
            hasSnapshots: false,
            hasFirePrefs: false,
            hasMortgage: false,
            hasGoals: false,
            hasDividends: false,
            hasBudget: false,
            hasPerformanceData: false,
            netWorthKEur: null as number | null,
        };
        if (!userDataJson) return base;
        try {
            const data = JSON.parse(userDataJson);
            const snapshots = Array.isArray(data.patrimonio) ? data.patrimonio : [];
            base.hasSnapshots = snapshots.length > 0;
            base.hasPerformanceData = snapshots.length >= 3;
            base.hasFirePrefs = !!data.preferences?.birthYear && !!data.preferences?.expectedMonthlyExpenses;
            base.hasMortgage = !!data.preferences?.propertyPrice && data.preferences.propertyPrice > 0;
            base.hasGoals = Array.isArray(data.obiettivi) && data.obiettivi.length > 0;
            base.hasDividends = Array.isArray(data.dividends) && data.dividends.length > 0;
            base.hasBudget = Array.isArray(data.budgetTransactions) && data.budgetTransactions.length > 0;
            const latestNw = data.derived?.timeline?.latest?.netWorth ?? data.derived?.latestNetWorth;
            if (typeof latestNw === "number") base.netWorthKEur = Math.round(latestNw / 1000);
        } catch {
            /* noop */
        }
        return base;
    }, [userDataJson]);

    const addComposerFiles = useCallback((files: File[]) => {
        if (files.length === 0) return;

        const errors: string[] = [];
        const slotsLeft = Math.max(0, AI_ATTACHMENT_MAX_FILES - composerAttachmentsRef.current.length);
        if (slotsLeft === 0) {
            toast.error(`Hai gia' raggiunto il limite di ${AI_ATTACHMENT_MAX_FILES} allegati.`);
            return;
        }

        const acceptedFiles = files.slice(0, slotsLeft);
        if (acceptedFiles.length < files.length) {
            errors.push(`Puoi allegare al massimo ${AI_ATTACHMENT_MAX_FILES} file per messaggio.`);
        }

        let runningTotal = composerAttachmentsRef.current.reduce((sum, attachment) => sum + attachment.size, 0);
        const additions: ChatAttachment[] = [];

        for (const file of acceptedFiles) {
            const validationError = validateAiAttachmentMeta(file);
            if (validationError) {
                errors.push(validationError);
                continue;
            }
            if (runningTotal + file.size > AI_ATTACHMENT_MAX_TOTAL_BYTES) {
                errors.push(`Gli allegati superano ${formatBytes(AI_ATTACHMENT_MAX_TOTAL_BYTES)} complessivi.`);
                continue;
            }

            runningTotal += file.size;
            additions.push({
                kind: file.type === "application/pdf" ? "pdf" : "image",
                mimeType: file.type,
                filename: file.name,
                size: file.size,
                url: URL.createObjectURL(file),
                file,
            });
        }

        if (additions.length > 0) {
            setComposerAttachments((prev) => [...prev, ...additions]);
        }
        if (errors.length > 0) {
            toast.error(errors[0]);
        }
    }, []);

    const removeComposerAttachment = (index: number) => {
        setComposerAttachments((prev) => {
            const next = [...prev];
            const [removed] = next.splice(index, 1);
            if (removed) revokeAttachmentUrls([removed]);
            return next;
        });
    };

    const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        addComposerFiles(Array.from(event.target.files ?? []));
        event.target.value = "";
    };

    const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
        const files = Array.from(event.clipboardData.items)
            .map((item) => (item.kind === "file" ? item.getAsFile() : null))
            .filter((file): file is File => !!file);
        if (files.length === 0) return;
        event.preventDefault();
        addComposerFiles(files);
    };

    const resolveAttachmentInput = useCallback(async (attachment: ChatAttachment): Promise<AiAttachmentInput> => {
        let dataUrl = "";
        if (attachment.file) {
            dataUrl = await fileToDataUrl(attachment.file);
        } else if (attachment.url) {
            const res = await fetch(attachment.url, { credentials: "include" });
            if (!res.ok) throw new Error(`Impossibile rileggere ${attachment.filename}`);
            const blob = await res.blob();
            dataUrl = await fileToDataUrl(blob);
        } else {
            throw new Error(`Allegato non disponibile: ${attachment.filename}`);
        }

        return {
            kind: attachment.kind,
            mimeType: attachment.mimeType,
            filename: attachment.filename,
            size: attachment.size,
            dataUrl,
        };
    }, []);

    const buildProviderMessages = useCallback(async (chatTurns: ChatTurn[]): Promise<AiChatMessage[]> => (
        Promise.all(chatTurns.map(async (turn) => ({
            role: turn.role,
            content: turn.content,
            attachments: turn.attachments?.length
                ? await Promise.all(turn.attachments.map((attachment) => resolveAttachmentInput(attachment)))
                : undefined,
        })))
    ), [resolveAttachmentInput]);

    const ensureThread = async (): Promise<string | null> => {
        if (activeThreadId) return activeThreadId;
        try {
            const res = await fetch("/api/ai/threads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({}),
            });
            if (!res.ok) throw new Error("Impossibile creare thread");
            const json = await res.json();
            setActiveThreadId(json.thread.id);
            setThreads((prev) => [json.thread, ...prev]);
            return json.thread.id;
        } catch (e) {
            toast.error((e as Error).message);
            return null;
        }
    };

    const persistMessage = async (
        threadId: string,
        role: "user" | "assistant",
        content: string,
        toolTrace?: AiToolTraceEntry[],
        attachments?: ChatAttachment[],
    ) => {
        try {
            const uploadableAttachments = attachments?.filter((attachment) => !!attachment.file) ?? [];
            if (uploadableAttachments.length > 0) {
                const formData = new FormData();
                formData.set("role", role);
                formData.set("content", content);
                if (toolTrace?.length) {
                    formData.set("toolTrace", JSON.stringify(toolTrace));
                }
                for (const attachment of uploadableAttachments) {
                    if (attachment.file) {
                        formData.append("attachments", attachment.file, attachment.filename);
                    }
                }
                await fetch(`/api/ai/threads/${threadId}/messages`, {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                });
                return;
            }

            await fetch(`/api/ai/threads/${threadId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ role, content, toolTrace: toolTrace ?? null }),
            });
        } catch {
            /* noop - client state is the source of truth for UI */
        }
    };

    const newThread = () => {
        revokeTurnAttachmentUrls(turnsRef.current);
        clearComposerAttachments(composerAttachmentsRef.current);
        setActiveThreadId(null);
        setTurns([]);
        setInput("");
        textareaRef.current?.focus();
    };

    const renameThread = async (id: string, title: string) => {
        try {
            const res = await fetch(`/api/ai/threads/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ title }),
            });
            if (!res.ok) throw new Error("Rinomina fallita");
            setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const deleteThread = async (id: string) => {
        try {
            const res = await fetch(`/api/ai/threads/${id}`, { method: "DELETE", credentials: "include" });
            if (!res.ok) throw new Error("Eliminazione fallita");
            setThreads((prev) => prev.filter((t) => t.id !== id));
            if (activeThreadId === id) {
                revokeTurnAttachmentUrls(turnsRef.current);
                clearComposerAttachments(composerAttachmentsRef.current);
                setActiveThreadId(null);
                setTurns([]);
                setInput("");
            }
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const toggleMemoryPin = async (id: string, pinned: boolean) => {
        try {
            const res = await fetch(`/api/ai/memory/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ pinned }),
            });
            if (!res.ok) throw new Error("Pin fallito");
            setMemory((prev) => prev.map((m) => (m.id === id ? { ...m, pinned } : m)));
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const deleteMemory = async (id: string) => {
        try {
            const res = await fetch(`/api/ai/memory/${id}`, { method: "DELETE", credentials: "include" });
            if (!res.ok) throw new Error("Eliminazione fallita");
            setMemory((prev) => prev.filter((m) => m.id !== id));
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const addMemory = async (category: string, fact: string) => {
        try {
            const res = await fetch("/api/ai/memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ category, fact, source: "manual" }),
            });
            if (!res.ok) throw new Error("Salvataggio fallito");
            const json = await res.json();
            setMemory((prev) => {
                const exists = prev.find((m) => m.id === json.memory.id);
                if (exists) return prev.map((m) => (m.id === json.memory.id ? json.memory : m));
                return [json.memory, ...prev];
            });
            toast.success("Fatto memorizzato");
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const clearChat = async () => {
        if (activeThreadId && confirm("Eliminare questa conversazione?")) {
            await deleteThread(activeThreadId);
        } else if (!activeThreadId) {
            revokeTurnAttachmentUrls(turnsRef.current);
            clearComposerAttachments(composerAttachmentsRef.current);
            setTurns([]);
            setInput("");
        }
    };

    const send = async (text?: string) => {
        const prompt = (text ?? input).trim();
        const hasAttachments = composerAttachments.length > 0;
        if ((!prompt && !hasAttachments) || sending) return;
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

        const threadId = await ensureThread();
        if (!threadId) return;

        const userAttachments = composerAttachments.map((attachment) => ({ ...attachment }));
        const userTurn: ChatTurn = {
            role: "user",
            content: prompt,
            attachments: userAttachments.length > 0 ? userAttachments : undefined,
        };
        const nextTurns = [...turns, userTurn];

        setTurns(nextTurns);
        setInput("");
        setComposerAttachments([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSending(true);
        setPendingTools([]);

        void persistMessage(threadId, "user", prompt, undefined, userAttachments);

        try {
            const providerMessages = await buildProviderMessages(nextTurns);
            const reply = await chat({
                provider: settings.provider,
                apiKey: settings.apiKey,
                model: settings.model,
                systemPrompt: buildSystemPrompt(userProfile, contextJson, memory),
                messages: providerMessages,
                tools: AI_TOOLS,
                onToolCall: (entry) => setPendingTools((prev) => [...prev, entry]),
            });

            const assistantText = reply.text || "(nessuna risposta)";
            const assistantTurn: ChatTurn = {
                role: "assistant",
                content: assistantText,
                toolTrace: reply.toolTrace.length > 0 ? reply.toolTrace : null,
            };
            setTurns([...nextTurns, assistantTurn]);

            void persistMessage(threadId, "assistant", assistantText, reply.toolTrace);

            setThreads((prev) => {
                const t = prev.find((x) => x.id === threadId);
                if (!t) return prev;
                const updated = { ...t, updatedAt: new Date().toISOString(), messageCount: t.messageCount + 2 };
                if (t.title === "Nuova conversazione") {
                    updated.title = prompt.slice(0, 60)
                        || userAttachments[0]?.filename
                        || "Nuova conversazione";
                }
                return [updated, ...prev.filter((x) => x.id !== threadId)];
            });

            if (prompt) {
                void (async () => {
                    try {
                        const extracted = await extractAndPersistMemory({
                            provider: settings.provider,
                            apiKey: settings.apiKey,
                            model: settings.model,
                            userMessage: prompt,
                            assistantMessage: assistantText,
                        });
                        if (extracted.length > 0) {
                            toast.success(`Memorizzati ${extracted.length} nuovi fatti`, { duration: 3000 });
                            void loadMemory();
                        }
                    } catch {
                        /* noop */
                    }
                })();
            }
        } catch (e) {
            toast.error(`Errore AI: ${(e as Error).message.slice(0, 200)}`);
        } finally {
            setSending(false);
            setPendingTools([]);
            textareaRef.current?.focus();
        }
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
                        L&apos;AI Advisor analizza i tuoi dati, mantiene memoria tra conversazioni e puo&apos; chiamare 23 strumenti per calcoli precisi.
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
                            <BrainCircuit className="size-5 text-purple-500" />
                            AI Advisor
                        </CardTitle>
                        <CardDescription className="max-w-2xl">
                            Consulente con memoria persistente tra conversazioni, accesso a tutti i tuoi dati (patrimonio, performance, dividendi, budget, obiettivi) e 23 strumenti di calcolo (Coast FIRE, Monte Carlo, sensitivity, sale tax, prezzi live, offerte mutui).
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <AiUserProfileModal
                            open={profileOpen}
                            onOpenChange={setProfileOpen}
                            trigger={(
                                <Button variant="outline" size="sm" title="Testo libero iniettato nel system prompt">
                                    <UserCircle2 className="mr-1 size-4" />
                                    Parlami di te
                                </Button>
                            )}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void refreshUserData()}
                            disabled={dataLoading}
                            title="Ricarica snapshot dati"
                        >
                            <RefreshCw className={`mr-1 size-4 ${dataLoading ? "animate-spin" : ""}`} />
                            Aggiorna dati
                        </Button>
                        <AiSettingsModal
                            open={settingsOpen}
                            onOpenChange={setSettingsOpen}
                            trigger={(
                                <Button variant="outline" size="sm">
                                    <Settings className="mr-1 size-4" />
                                    Config
                                </Button>
                            )}
                        />
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                        <span>
                            <strong>Provider:</strong>{" "}
                            {isConfigured ? `${settings.provider === "gemini" ? "Gemini" : "OpenRouter"} - ${settings.model}` : "non configurato"}
                        </span>
                        <span className="opacity-60">|</span>
                        <span><strong>Contesto:</strong> {userDataJson ? `${(dataBytes / 1024).toFixed(1)} KB` : "vuoto"}</span>
                        <span className="opacity-60">|</span>
                        <span><strong>Tools:</strong> {AI_TOOLS.length}</span>
                        <span className="opacity-60">|</span>
                        <span><strong>Memoria:</strong> {memory.length} fatti</span>
                        <span className="opacity-60">|</span>
                        <span>
                            <strong>Profilo:</strong>{" "}
                            <button type="button" onClick={() => setProfileOpen(true)} className="underline hover:text-foreground">
                                {userProfile.trim() ? `compilato (${userProfile.length} car.)` : "vuoto"}
                            </button>
                        </span>
                    </div>

                    <div className="flex flex-col gap-4 lg:flex-row">
                        <ThreadSidebar
                            threads={threads}
                            activeId={activeThreadId}
                            onSelect={loadThread}
                            onNew={newThread}
                            onRename={renameThread}
                            onDelete={deleteThread}
                            loading={threadsLoading}
                        />

                        <div className="min-w-0 flex-1 space-y-3">
                            <div className="min-h-[32rem] space-y-3 rounded-2xl border border-border/60 bg-background/60 p-3">
                                {threadLoading ? (
                                    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                                        <Loader2 className="size-4 animate-spin" /> Caricamento conversazione...
                                    </div>
                                ) : turns.length === 0 && !sending ? (
                                    <ContextualPromptChips signals={contextSignals} onPick={(p) => void send(p)} />
                                ) : (
                                    turns.map((t, i) => (
                                        <ChatMessage
                                            key={t.id ?? i}
                                            role={t.role}
                                            content={t.content}
                                            attachments={t.attachments}
                                            tools={t.toolTrace}
                                        />
                                    ))
                                )}

                                {sending && (
                                    <div className="flex gap-2">
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                                            <Bot className="size-4 text-purple-500" />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
                                                <Loader2 className="size-4 animate-spin" />
                                                {pendingTools.length > 0 ? `Eseguo strumenti (${pendingTools.length})...` : "Sto pensando..."}
                                            </div>
                                            {pendingTools.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {pendingTools.map((t, i) => (
                                                        <span key={i} className="rounded-full bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-700 dark:text-purple-300">
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

                            <div className="rounded-2xl border border-border/60 bg-background/70 p-2">
                                {composerAttachments.length > 0 && (
                                    <div className="mb-2 flex flex-wrap gap-2">
                                        {composerAttachments.map((attachment, index) => (
                                            <div key={`${attachment.filename}-${attachment.size}-${index}`} className="flex max-w-full items-center gap-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                                                {attachment.kind === "pdf" ? (
                                                    <FileText className="size-4 shrink-0 text-red-500" />
                                                ) : (
                                                    <>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={attachment.url} alt={attachment.filename} className="size-8 shrink-0 rounded-lg object-cover" />
                                                    </>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium">{attachment.filename}</div>
                                                    <div className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeComposerAttachment(index)}
                                                    className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                                                    aria-label={`Rimuovi ${attachment.filename}`}
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={onKeyDown}
                                    onPaste={handlePaste}
                                    placeholder={
                                        isConfigured
                                            ? "Scrivi la tua domanda oppure incolla un'immagine... (Invio per inviare, Shift+Invio per nuova riga)"
                                            : "Configura provider e API key per iniziare"
                                    }
                                    rows={3}
                                    disabled={!isConfigured || sending}
                                    className="min-h-[5.5rem] w-full resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
                                />

                                <div className="flex flex-col gap-2 border-t border-border/60 px-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept={AI_ATTACHMENT_ACCEPT}
                                            multiple
                                            className="hidden"
                                            onChange={handleFileInputChange}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={!isConfigured || sending}
                                        >
                                            <Paperclip className="mr-1 size-4" />
                                            Allega
                                        </Button>
                                        <span>PNG, JPG, GIF, WebP o PDF</span>
                                        <span className="opacity-60">|</span>
                                        <span>max {AI_ATTACHMENT_MAX_FILES} file / {formatBytes(AI_ATTACHMENT_MAX_TOTAL_BYTES)}</span>
                                    </div>

                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            onClick={() => void send()}
                                            disabled={(!input.trim() && composerAttachments.length === 0) || sending || !isConfigured}
                                            className="bg-purple-500 text-white hover:bg-purple-600"
                                        >
                                            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                        </Button>
                                        {turns.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={clearChat}
                                                title="Elimina conversazione corrente"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <MemoryPanel
                        memory={memory}
                        onTogglePin={toggleMemoryPin}
                        onDelete={deleteMemory}
                        onAdd={addMemory}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
