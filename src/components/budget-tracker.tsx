"use client";

import { useState, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Upload, AlertTriangle, CheckCircle, Pencil, X, Check } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { parseBankCSV, type ImportResult } from "@/lib/import/bank-csv";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

interface BudgetCategory {
    name: string;
    limit: number;
}

const DEFAULT_CATEGORIES: BudgetCategory[] = [
    { name: "Spesa", limit: 400 },
    { name: "Utenze", limit: 200 },
    { name: "Trasporti", limit: 150 },
    { name: "Ristorazione", limit: 100 },
    { name: "Shopping Online", limit: 100 },
    { name: "Assicurazione", limit: 100 },
    { name: "Altro", limit: 300 },
];

export function BudgetTracker() {
    const [categories, setCategories] = useState<BudgetCategory[]>(DEFAULT_CATEGORIES);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editLimit, setEditLimit] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const result = parseBankCSV(text);
        if (result.transactions.length > 0) setImportResult(result);
    };

    const startEdit = (idx: number) => {
        setEditingIdx(idx);
        setEditLimit(String(categories[idx].limit));
    };

    const saveEdit = (idx: number) => {
        const newCategories = [...categories];
        newCategories[idx] = { ...newCategories[idx], limit: Math.max(0, Number(editLimit) || 0) };
        setCategories(newCategories);
        setEditingIdx(null);
    };

    const categorySpending = useMemo(() => {
        if (!importResult || importResult.monthlySummary.length === 0) return null;

        const categoryTotals = new Map<string, number>();
        for (const transaction of importResult.transactions) {
            if (transaction.amount >= 0) continue;
            const category = transaction.category || "Altro";
            categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(transaction.amount));
        }

        const months = importResult.monthlySummary.length;
        const monthlyAvg = new Map<string, number>();
        for (const [category, total] of categoryTotals) {
            monthlyAvg.set(category, Math.round(total / months));
        }

        return monthlyAvg;
    }, [importResult]);

    const comparisonData = useMemo(() => {
        return categories.map((category) => {
            const actual = categorySpending?.get(category.name) || 0;
            const overBudget = actual > category.limit;
            return {
                name: category.name,
                Budget: category.limit,
                "Spesa Media": actual,
                overBudget,
            };
        });
    }, [categories, categorySpending]);

    const totalBudget = categories.reduce((sum, category) => sum + category.limit, 0);
    const totalActual = comparisonData.reduce((sum, category) => sum + category["Spesa Media"], 0);
    const overBudgetCount = comparisonData.filter((category) => category.overBudget && category["Spesa Media"] > 0).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-violet-50 p-2.5 dark:bg-violet-950/50">
                        <Wallet className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Budget Mensile</h2>
                        <p className="text-xs text-muted-foreground">Imposta limiti per categoria e confrontali con le spese reali</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl text-xs sm:self-auto"
                    onClick={() => fileRef.current?.click()}
                >
                    <Upload className="mr-1 h-3.5 w-3.5" /> {importResult ? "Aggiorna CSV" : "Importa CSV"}
                </Button>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleImport} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-3xl border border-violet-200 bg-violet-50/90 p-4 dark:border-violet-800 dark:bg-violet-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Budget Totale</p>
                    <p className="mt-1 text-xl font-extrabold text-violet-600 dark:text-violet-400">{formatEuro(totalBudget)}</p>
                    <p className="text-[10px] text-violet-400">/mese</p>
                </div>
                <div className={`rounded-3xl border p-4 ${totalActual > totalBudget ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30" : "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Spesa Media</p>
                    <p className={`mt-1 text-xl font-extrabold ${totalActual > totalBudget ? "text-red-600" : "text-emerald-600"}`}>
                        {importResult ? formatEuro(totalActual) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">/mese</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-muted/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categorie Oltre</p>
                    <p className="mt-1 text-xl font-extrabold text-foreground">{importResult ? overBudgetCount : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">su {categories.length}</p>
                </div>
            </div>

            <Card className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl">
                <CardContent className="space-y-3 p-5">
                    <h3 className="text-sm font-bold text-muted-foreground">Budget per Categoria</h3>
                    <div className="space-y-2">
                        {comparisonData.map((item, idx) => {
                            const pct = item.Budget > 0 ? Math.min(100, (item["Spesa Media"] / item.Budget) * 100) : 0;
                            const isEditing = editingIdx === idx;

                            return (
                                <div key={item.name} className="space-y-2 rounded-2xl border border-border/60 bg-background/50 p-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2">
                                            {item.overBudget && item["Spesa Media"] > 0 ? (
                                                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                            ) : item["Spesa Media"] > 0 ? (
                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                            ) : null}
                                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                            {isEditing ? (
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        value={editLimit}
                                                        onChange={(e) => setEditLimit(e.target.value)}
                                                        className="h-9 w-24 rounded-xl text-xs"
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => saveEdit(idx)}
                                                        className="rounded-lg p-1 text-emerald-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20"
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingIdx(null)}
                                                        className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {importResult && (
                                                        <span className={`text-xs font-bold ${item.overBudget ? "text-red-500" : "text-emerald-600"}`}>
                                                            {formatEuro(item["Spesa Media"])}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-muted-foreground">/ {formatEuro(item.Budget)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(idx)}
                                                        className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-950/20"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {importResult && (
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${item.overBudget ? "bg-red-500" : "bg-emerald-500"}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {importResult && (
                <Card className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl">
                    <CardContent className="p-5">
                        <h3 className="mb-4 text-sm font-bold text-muted-foreground">Budget vs Spesa Reale</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(value: number) => `${value}`} />
                                    <Tooltip
                                        formatter={(value: number | string | undefined) => formatEuro(Number(value ?? 0))}
                                        contentStyle={{
                                            borderRadius: "16px",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "var(--popover)",
                                            color: "var(--popover-foreground)",
                                            boxShadow: "0 16px 40px -16px rgba(15, 23, 42, 0.45)",
                                        }}
                                    />
                                    <Bar dataKey="Budget" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Spesa Media" radius={[4, 4, 0, 0]}>
                                        {comparisonData.map((entry, index) => (
                                            <Cell key={index} fill={entry.overBudget ? "#ef4444" : "#10b981"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!importResult && (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-8 text-center text-sm text-muted-foreground">
                    Importa un estratto conto CSV per confrontare le tue spese reali con il budget.
                </div>
            )}
        </div>
    );
}
