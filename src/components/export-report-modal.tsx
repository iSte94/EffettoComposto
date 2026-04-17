"use client";

import { memo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, Check, Wallet, PieChart, Flame, TrendingUp, Building2, Gift } from "lucide-react";

interface ReportSection {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    defaultChecked: boolean;
}

const SECTIONS: ReportSection[] = [
    {
        id: "patrimonio",
        label: "Patrimonio",
        description: "Snapshot netto, storico, componenti asset",
        icon: <Wallet className="w-4 h-4" />,
        defaultChecked: true,
    },
    {
        id: "allocazione",
        label: "Allocazione",
        description: "Asset allocation e distribuzione per classe",
        icon: <PieChart className="w-4 h-4" />,
        defaultChecked: true,
    },
    {
        id: "performance",
        label: "Performance",
        description: "ROI, CAGR, TWR, volatilità, drawdown",
        icon: <TrendingUp className="w-4 h-4" />,
        defaultChecked: true,
    },
    {
        id: "fire",
        label: "FIRE",
        description: "Progresso verso l'indipendenza finanziaria",
        icon: <Flame className="w-4 h-4" />,
        defaultChecked: true,
    },
    {
        id: "mutuo",
        label: "Mutuo / Debiti",
        description: "Piano ammortamento e rate residue",
        icon: <Building2 className="w-4 h-4" />,
        defaultChecked: false,
    },
    {
        id: "dividendi",
        label: "Dividendi",
        description: "Overview, calendario, YoC",
        icon: <Gift className="w-4 h-4" />,
        defaultChecked: false,
    },
];

interface ExportReportModalProps {
    trigger?: React.ReactNode;
}

export const ExportReportModal = memo(function ExportReportModal({ trigger }: ExportReportModalProps) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(
        new Set(SECTIONS.filter((s) => s.defaultChecked).map((s) => s.id))
    );

    const toggleSection = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === SECTIONS.length) setSelected(new Set());
        else setSelected(new Set(SECTIONS.map((s) => s.id)));
    };

    const handleExport = () => {
        const sections = Array.from(selected).join(",");
        if (!sections) return;
        const url = `/report/export?sections=${encodeURIComponent(sections)}`;
        window.open(url, "_blank", "noopener,noreferrer");
        setOpen(false);
    };

    const allSelected = selected.size === SECTIONS.length;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                        <FileDown className="w-3.5 h-3.5" /> Esporta Report
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-card/95 backdrop-blur-xl border-border/70 rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <FileDown className="w-5 h-5 text-violet-500" /> Esporta Report Patrimoniale
                    </DialogTitle>
                    <DialogDescription>
                        Seleziona le sezioni da includere. Si aprirà una nuova scheda con il report, pronta per la stampa o il salvataggio in PDF.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Sezioni ({selected.size}/{SECTIONS.length})
                        </span>
                        <button
                            onClick={toggleAll}
                            className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                        >
                            {allSelected ? "Deseleziona tutto" : "Seleziona tutto"}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SECTIONS.map((s) => {
                            const isSelected = selected.has(s.id);
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => toggleSection(s.id)}
                                    className={`
                                        flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition-all
                                        ${isSelected
                                            ? "border-violet-500 bg-violet-50/80 dark:bg-violet-950/30"
                                            : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"
                                        }
                                    `}
                                >
                                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                        isSelected
                                            ? "bg-violet-500 text-white"
                                            : "bg-muted text-muted-foreground"
                                    }`}>
                                        {isSelected ? <Check className="w-4 h-4" /> : s.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-bold ${isSelected ? "text-violet-700 dark:text-violet-300" : ""}`}>
                                            {s.label}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                            {s.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-4 border-t border-border/70">
                        <div className="text-[10px] text-muted-foreground italic flex-1">
                            Nel report usa il comando &quot;Salva come PDF&quot; del browser per ottenere un file.
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                            Annulla
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={selected.size === 0}
                            className="bg-violet-500 hover:bg-violet-600 text-white rounded-full gap-1.5"
                        >
                            <Printer className="w-4 h-4" /> Apri Report
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});
