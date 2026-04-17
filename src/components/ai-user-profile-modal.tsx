"use client";
import { useEffect, useState } from "react";
import { UserCircle2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useAiUserProfile } from "@/hooks/useAiUserProfile";

interface Props {
    trigger: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const PLACEHOLDER = `Esempio:
- Ho 32 anni, vivo a Milano, lavoro come sviluppatore software (RAL ~50k).
- Sono single, nessun figlio, ma sto pensando di prendere casa nei prossimi 2 anni.
- Obiettivo principale: raggiungere FIRE entro i 50 anni.
- Tolleranza al rischio: medio-alta, sono comodo con volatilita' di mercato.
- Mi interessa molto l'asset allocation passiva (ETF world + bond), non sono uno stock picker.
- Non ho debiti se non un piccolo finanziamento auto.`;

const MAX_LEN = 8000;

export function AiUserProfileModal({ trigger, open: controlledOpen, onOpenChange }: Props) {
    const { profile, loaded, save } = useAiUserProfile();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && loaded) setDraft(profile);
    }, [open, loaded, profile]);

    const handleSave = async () => {
        if (draft.length > MAX_LEN) {
            toast.error(`Massimo ${MAX_LEN} caratteri`);
            return;
        }
        setSaving(true);
        try {
            await save(draft);
            toast.success("Profilo salvato — verra' iniettato in ogni messaggio all'AI");
            setOpen(false);
        } catch (e) {
            toast.error(`Errore: ${(e as Error).message.slice(0, 200)}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl rounded-3xl border border-border bg-background/90 text-foreground shadow-2xl backdrop-blur-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <UserCircle2 className="size-5 text-purple-500" /> Parlami di te
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Scrivi qui qualunque cosa vuoi che l&apos;AI sappia di te: eta&apos;, lavoro,
                        situazione familiare, obiettivi di vita, tolleranza al rischio, vincoli,
                        preferenze d&apos;investimento. Questo testo viene allegato al system prompt di
                        ogni messaggio (insieme allo snapshot dati). Salvato sul tuo account.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="ai-user-profile">Il tuo profilo</Label>
                        <textarea
                            id="ai-user-profile"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder={PLACEHOLDER}
                            rows={14}
                            maxLength={MAX_LEN}
                            className="w-full resize-y rounded-xl border border-border bg-background/80 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {draft.length}/{MAX_LEN} caratteri
                            </span>
                            <span>
                                Tieni le info concise: ogni carattere occupa contesto in ogni richiesta.
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            Annulla
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Salvataggio..." : "Salva"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
