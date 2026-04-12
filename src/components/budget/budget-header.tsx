"use client";

import { memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Upload, Trash2 } from "lucide-react";
import type { BudgetViewMode } from "@/types/budget";

interface BudgetHeaderProps {
    availableMonths: string[];
    currentMonth: string | undefined;
    viewMode: BudgetViewMode;
    hasTransactions: boolean;
    onViewModeChange: (mode: BudgetViewMode) => void;
    onMonthChange: (month: string | undefined) => void;
    onImport: (file: File) => void;
    onReset: () => void;
}

function formatMonthLabel(month: string): string {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

function BudgetHeaderComponent({
    availableMonths,
    currentMonth,
    viewMode,
    hasTransactions,
    onViewModeChange,
    onMonthChange,
    onImport,
    onReset,
}: BudgetHeaderProps) {
    const fileRef = useRef<HTMLInputElement>(null);

    const handleValueChange = (value: string) => {
        if (value === "__avg__") {
            onViewModeChange("avg");
            onMonthChange(undefined);
        } else {
            onViewModeChange("month");
            onMonthChange(value);
        }
    };

    const currentValue = viewMode === "avg" ? "__avg__" : (currentMonth || "__avg__");

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-violet-50 p-2.5 dark:bg-violet-950/50">
                    <Wallet className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Budget Mensile</h2>
                    <p className="text-xs text-muted-foreground">
                        Imposta limiti, importa estratti conto e analizza le tue spese mese per mese
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {availableMonths.length > 0 && (
                    <Select value={currentValue} onValueChange={handleValueChange}>
                        <SelectTrigger className="h-10 min-h-10 w-44 rounded-xl text-xs">
                            <SelectValue placeholder="Periodo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__avg__">Media (tutti i mesi)</SelectItem>
                            {availableMonths.map((m) => (
                                <SelectItem key={m} value={m}>{formatMonthLabel(m)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl text-xs"
                    onClick={() => fileRef.current?.click()}
                >
                    <Upload className="mr-1 h-3.5 w-3.5" /> Importa CSV
                </Button>
                {hasTransactions && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-10 rounded-xl text-xs text-muted-foreground hover:text-red-500"
                        onClick={onReset}
                    >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Reset
                    </Button>
                )}
                <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImport(file);
                        e.target.value = "";
                    }}
                />
            </div>
        </div>
    );
}

export const BudgetHeader = memo(BudgetHeaderComponent);
