"use client";

import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UncategorizedAlertProps {
    count: number;
    onOpen: () => void;
    onReapply: () => void;
}

function UncategorizedAlertComponent({ count, onOpen, onReapply }: UncategorizedAlertProps) {
    if (count === 0) return null;
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800/60 dark:bg-amber-950/25 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        {count} {count === 1 ? "transazione non categorizzata" : "transazioni non categorizzate"}
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
                        Aggiungi parole chiave alle tue categorie o ri-applica le regole.
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs" onClick={onOpen}>
                    Rivedi
                </Button>
                <Button size="sm" className="h-9 rounded-xl bg-amber-500 text-xs hover:bg-amber-600" onClick={onReapply}>
                    Ri-applica regole
                </Button>
            </div>
        </div>
    );
}

export const UncategorizedAlert = memo(UncategorizedAlertComponent);
