"use client";
import { useEffect, useState } from "react";
import { Bot, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAiSettings } from "@/hooks/useAiSettings";
import { useAuth } from "@/contexts/auth-context";
import { listModels, type AiModel, type AiProvider } from "@/lib/ai/providers";

interface Props {
    trigger: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AiSettingsModal({ trigger, open: controlledOpen, onOpenChange }: Props) {
    const { settings, save, clear, loaded } = useAiSettings();
    const { user } = useAuth();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    const [provider, setProvider] = useState<AiProvider>("gemini");
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("");
    const [rememberOnAccount, setRememberOnAccount] = useState(false);
    const [models, setModels] = useState<AiModel[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (loaded && open) {
            setProvider(settings.provider);
            setApiKey(settings.apiKey);
            setModel(settings.model);
            setRememberOnAccount(settings.rememberOnAccount && !!user);
        }
    }, [loaded, open, settings, user]);

    const fetchModels = async () => {
        if (!apiKey) {
            toast.error("Inserisci prima una API key");
            return;
        }
        setLoadingModels(true);
        try {
            const list = await listModels(provider, apiKey);
            setModels(list);
            toast.success(`${list.length} modelli disponibili`);
        } catch (e) {
            toast.error(`Errore: ${(e as Error).message.slice(0, 200)}`);
        } finally {
            setLoadingModels(false);
        }
    };

    const handleSave = async () => {
        if (!apiKey) return toast.error("Inserisci una API key");
        if (!model) return toast.error("Seleziona o digita un modello");
        setSaving(true);
        try {
            await save({ provider, apiKey, model, rememberOnAccount: rememberOnAccount && !!user });
            toast.success(
                rememberOnAccount && user
                    ? "Impostazioni AI salvate sul tuo account"
                    : "Impostazioni AI salvate in locale",
            );
            setOpen(false);
        } catch (e) {
            toast.error(`Errore: ${(e as Error).message.slice(0, 200)}`);
        } finally {
            setSaving(false);
        }
    };

    const handleClear = async () => {
        try {
            await clear();
            setApiKey("");
            setModel("");
            setModels([]);
            setRememberOnAccount(false);
            toast.success("Impostazioni AI rimosse");
        } catch {
            toast.error("Errore nella rimozione");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg rounded-3xl border border-border bg-background/90 text-foreground shadow-2xl backdrop-blur-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Bot className="size-5 text-purple-500" /> Impostazioni AI
                    </DialogTitle>
                    <DialogDescription className="space-y-2 text-muted-foreground">
                        <span className="block">
                            La chiave è memorizzata nel browser. Puoi opzionalmente salvarla anche sul
                            tuo account, cifrata con <strong>AES-256-GCM</strong> sul server, per
                            ritrovarla da altri dispositivi. Le richieste al modello partono sempre
                            direttamente dal browser al provider — non passano dai nostri server.
                        </span>
                        <span className="block text-xs">
                            Il codice è{" "}
                            <a
                                href="https://github.com/iSte94/EffettoComposto"
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-foreground"
                            >
                                open source
                            </a>
                            : puoi verificare che la chiave non venga mai loggata né usata per altro. Il
                            server la decifra solo per restituirtela quando accedi.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select
                            value={provider}
                            onValueChange={(v) => {
                                setProvider(v as AiProvider);
                                setModels([]);
                                setModel("");
                            }}
                        >
                            <SelectTrigger className="min-h-11">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gemini">Google Gemini (AI Studio)</SelectItem>
                                <SelectItem value="openrouter">OpenRouter</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ai-api-key">API key</Label>
                        <Input
                            id="ai-api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={provider === "gemini" ? "AIza..." : "sk-or-..."}
                            className="min-h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                            {provider === "gemini"
                                ? "Ottieni una chiave da aistudio.google.com/app/apikey"
                                : "Ottieni una chiave da openrouter.ai/keys"}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Modello</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={fetchModels}
                                disabled={loadingModels}
                            >
                                <RefreshCw
                                    className={`size-3 mr-1 ${loadingModels ? "animate-spin" : ""}`}
                                />
                                Carica elenco
                            </Button>
                        </div>
                        {models.length > 0 ? (
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger className="min-h-11">
                                    <SelectValue placeholder="Seleziona un modello" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    {models.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder={
                                    provider === "gemini"
                                        ? "es: gemini-2.5-flash"
                                        : "es: openai/gpt-4o-mini"
                                }
                                className="min-h-11"
                            />
                        )}
                        <p className="text-xs text-muted-foreground">
                            Clicca &quot;Carica elenco&quot; per vedere tutti i modelli disponibili con la tua
                            chiave, oppure digita manualmente l&apos;id.
                        </p>
                    </div>

                    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/50 bg-muted/30 p-3">
                        <div className="space-y-1">
                            <Label htmlFor="ai-remember" className="text-sm font-medium">
                                Ricorda su questo account
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {user
                                    ? "Salva la chiave anche sul server (cifrata AES-256-GCM) per recuperarla da altri dispositivi."
                                    : "Disponibile solo dopo aver effettuato l'accesso."}
                            </p>
                        </div>
                        <Switch
                            id="ai-remember"
                            checked={rememberOnAccount}
                            onCheckedChange={setRememberOnAccount}
                            disabled={!user}
                        />
                    </div>

                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClear}
                            className="text-red-600 hover:text-red-700"
                        >
                            <Trash2 className="size-4 mr-2" /> Rimuovi
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setOpen(false)}>
                                Annulla
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? "Salvataggio..." : "Salva"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
