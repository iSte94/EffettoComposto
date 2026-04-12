"use client";

import { memo, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { BudgetCategory, BudgetTransaction } from "@/types/budget";

interface TransactionDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    transactions: BudgetTransaction[];
    categories: BudgetCategory[];
    onChangeCategory: (id: string, category: string) => void;
    onDelete: (id: string) => void;
}

function TransactionDrawerComponent({
    open,
    onOpenChange,
    title,
    description,
    transactions,
    categories,
    onChangeCategory,
    onDelete,
}: TransactionDrawerProps) {
    const [filter, setFilter] = useState("");

    const filtered = useMemo(() => {
        const f = filter.trim().toLowerCase();
        if (!f) return transactions;
        return transactions.filter(t => t.description.toLowerCase().includes(f));
    }, [transactions, filter]);

    const total = useMemo(
        () => transactions.reduce((s, t) => s + (t.amount < 0 ? Math.abs(t.amount) : 0), 0),
        [transactions]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden rounded-3xl p-0">
                <DialogHeader className="border-b border-border/60 px-6 py-4">
                    <DialogTitle className="text-base">{title}</DialogTitle>
                    <DialogDescription className="text-xs">
                        {description || `${transactions.length} transazioni · ${formatEuro(total)} totale spese`}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 p-4">
                    <Input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Cerca per descrizione..."
                        className="h-9 rounded-xl text-xs"
                    />
                    <div className="max-h-[55vh] space-y-1 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <p className="py-8 text-center text-xs text-muted-foreground">Nessuna transazione</p>
                        ) : filtered.map((tx) => (
                            <div
                                key={tx.id}
                                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-foreground">{tx.description}</p>
                                    <p className="text-[10px] text-muted-foreground">{tx.date}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${tx.amount < 0 ? "text-red-500" : "text-emerald-600"}`}>
                                        {formatEuro(tx.amount)}
                                    </span>
                                    <Select
                                        value={tx.category}
                                        onValueChange={(v) => onChangeCategory(tx.id, v)}
                                    >
                                        <SelectTrigger className="h-8 w-36 rounded-lg text-[11px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => (
                                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-red-500"
                                        onClick={() => onDelete(tx.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export const TransactionDrawer = memo(TransactionDrawerComponent);
