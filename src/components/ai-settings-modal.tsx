"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
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
import { useAiSettings } from "@/hooks/useAiSettings";
import type { AiModel, AiProvider } from "@/lib/ai/providers";
import { listModels } from "@/lib/ai/providers";

interface Props {
    trigger: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AiSettingsModal({ trigger, open: controlledOpen, onOpenChange }: Props) {
    const { settings, save, clear, loaded } = useAiSettings();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    const [provider, setProvider] = useState<AiProvider>("gemini");
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("");
    const [models, setModels] = useState<AiModel[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [saving, setSaving] = useState(false);

    const hasStoredKey = settings.hasStoredKey;

    useEffect(() => {
        if (loaded && open) {
            setProvider(settings.provider ?? "gemini");
            setModel(settings.model ?? "");
            setApiKey("");
            setModels([]);
        }
    }, [loaded, open, settings]);

    const fetchModels = async () => {
        if (!apiKey.trim()) {
            toast.error("Inserisci prima una API key per caricare l'elenco dei modelli");
            return;
        }
        setLoadingModels(true);
        try {
            const list = await listModels(provider, apiKey.trim());
            setModels(list);
            toast.success(`${list.length} modelli disponibili`);
        } catch (e) {
            toast.error(`Errore: ${(e as Error).message.slice(0, 200)}`);
        } finally {
            setLoadingModels(false);
        }
    };

    const handleSave = async () => {
        if (!model.trim()) {
            toast.error("Seleziona o digita un modello");
            return;
        }
        if (!hasStoredKey && !apiKey.trim()) {
            toast.error("Inserisci una API key da salvare sul server");
            return;
        }

        setSaving(true);
        try {
            await save({
                provider,
                model: model.trim(),
                apiKey: apiKey.trim() || undefined,
            });
            toast.success(
                hasStoredKey && !apiKey.trim()
                    ? "Provider e modello aggiornati"
                    : "Configurazione AI salvata sul tuo account",
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
            toast.success("Configurazione AI rimossa");
        } catch (e) {
            toast.error((e as Error).message || "Errore nella rimozione");
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
                            La chat AI web e il bot Telegram usano lo stesso motore server-side. Per questo la chiave deve essere salvata sul tuo account, cifrata con <strong>AES-256-GCM</strong>.
                        </span>
                        <span className="block text-xs">
                            Il browser non riceve più la chiave salvata. Se vuoi sostituirla, inseriscine una nuova qui sotto e il server aggiornerà quella esistente.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                        <div className="flex items-center gap-2 font-medium">
                            <ShieldCheck className="size-4" />
                            Stato chiave: {hasStoredKey ? "presente sul server" : "non configurata"}
                        </div>
                        <p className="mt-1 text-[11px] opacity-90">
                            {hasStoredKey
                                ? "Puoi lasciare vuoto il campo API key per mantenere quella attuale."
                                : "Serve una chiave valida per attivare sia la tab AI sia Telegram."}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select
                            value={provider}
                            onValueChange={(value) => {
                                setProvider(value as AiProvider);
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
                        <Label htmlFor="ai-api-key">
                            API key {hasStoredKey ? "(opzionale se non vuoi cambiarla)" : ""}
                        </Label>
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
                                <RefreshCw className={`mr-1 size-3 ${loadingModels ? "animate-spin" : ""}`} />
                                Carica elenco
                            </Button>
                        </div>
                        {models.length > 0 ? (
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger className="min-h-11">
                                    <SelectValue placeholder="Seleziona un modello" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    {models.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder={provider === "gemini" ? "es: gemini-2.5-flash" : "es: openai/gpt-4o-mini"}
                                className="min-h-11"
                            />
                        )}
                        <p className="text-xs text-muted-foreground">
                            L&apos;elenco modelli si carica usando la chiave che stai inserendo ora. Se lasci il campo vuoto, puoi comunque digitare manualmente l&apos;id del modello.
                        </p>
                    </div>

                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleClear}
                            className="text-red-600 hover:text-red-700"
                        >
                            <Trash2 className="mr-2 size-4" /> Rimuovi
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
