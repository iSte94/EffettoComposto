"use client";

import { memo } from "react";
import { Sparkles } from "lucide-react";

interface ContextSignals {
    hasSnapshots: boolean;
    hasFirePrefs: boolean;
    hasMortgage: boolean;
    hasGoals: boolean;
    hasDividends: boolean;
    hasBudget: boolean;
    hasPerformanceData: boolean;
    netWorthKEur: number | null;
}

interface Props {
    signals: ContextSignals;
    onPick: (prompt: string) => void;
}

export const ContextualPromptChips = memo(function ContextualPromptChips({ signals, onPick }: Props) {
    const prompts: string[] = [];

    // Ordered by relevance to user state
    if (signals.hasPerformanceData) {
        prompts.push("Analizza la mia performance: ROI, TWR e drawdown — su cosa dovrei concentrarmi?");
    }
    if (signals.hasSnapshots && signals.hasFirePrefs) {
        prompts.push("Sono sulla buona strada per FIRE? Analizza il gap e suggerisci azioni.");
    }
    if (signals.hasSnapshots) {
        prompts.push("Quanto è cresciuto il mio patrimonio nell'ultimo anno? Mostrami la composizione.");
    }
    if (signals.hasDividends) {
        prompts.push("Calcola il mio Yield on Cost e confrontalo con il current yield del portafoglio.");
    }
    if (signals.hasBudget) {
        prompts.push("Rivedi il mio budget: dove sto sforando e dove posso risparmiare?");
    }
    if (signals.hasGoals) {
        prompts.push("Sto raggiungendo gli obiettivi di risparmio? Quali sono a rischio?");
    }
    if (signals.hasMortgage) {
        prompts.push("Valuta se conviene estinguere anticipatamente il mutuo vs investire la differenza.");
    }

    // Universal suggestions if not many contextual ones
    if (prompts.length < 4) {
        prompts.push("Simula Monte Carlo FIRE per i prossimi 20 anni con i miei parametri attuali.");
        prompts.push("Confronta le migliori offerte mutuo a tasso fisso 30 anni sul mercato.");
        prompts.push("Calcola il netto di uno stipendio da RAL 45.000 con 14 mensilità.");
        prompts.push("Se vendo ora 100 quote del mio ETF, quante tasse pago sul capital gain?");
    }

    const slice = prompts.slice(0, 6);

    return (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Sparkles className="size-10 text-purple-400" />
            <div className="max-w-md space-y-1">
                <p className="text-sm font-semibold text-foreground">Pronto a ragionare insieme</p>
                <p className="text-xs text-muted-foreground">
                    Ho accesso ai tuoi dati + 23 strumenti (Monte Carlo, ammortamento, fiscal, prezzi live, memoria).
                    Scegli uno spunto o chiedimi qualunque cosa.
                </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {slice.map((p) => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onPick(p)}
                        className="rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-purple-500/10 hover:border-purple-400/50 hover:text-purple-700 dark:hover:text-purple-300 text-left max-w-md"
                    >
                        {p}
                    </button>
                ))}
            </div>
        </div>
    );
});
