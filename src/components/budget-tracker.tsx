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
        const newCats = [...categories];
        newCats[idx] = { ...newCats[idx], limit: Math.max(0, Number(editLimit) || 0) };
        setCategories(newCats);
        setEditingIdx(null);
    };

    // Calculate average monthly spending per category from imported data
    const categorySpending = useMemo(() => {
        if (!importResult || importResult.monthlySummary.length === 0) return null;

        const catTotals = new Map<string, number>();
        for (const t of importResult.transactions) {
            if (t.amount >= 0) continue;
            const cat = t.category || "Altro";
            catTotals.set(cat, (catTotals.get(cat) || 0) + Math.abs(t.amount));
        }

        const months = importResult.monthlySummary.length;
        const monthlyAvg = new Map<string, number>();
        for (const [cat, total] of catTotals) {
            monthlyAvg.set(cat, Math.round(total / months));
        }

        return monthlyAvg;
    }, [importResult]);

    // Build comparison data
    const comparisonData = useMemo(() => {
        return categories.map(cat => {
            const actual = categorySpending?.get(cat.name) || 0;
            const overBudget = actual > cat.limit;
            return {
                name: cat.name,
                Budget: cat.limit,
                "Spesa Media": actual,
                overBudget,
                diff: cat.limit - actual,
            };
        });
    }, [categories, categorySpending]);

    const totalBudget = categories.reduce((s, c) => s + c.limit, 0);
    const totalActual = comparisonData.reduce((s, c) => s + c["Spesa Media"], 0);
    const overBudgetCount = comparisonData.filter(c => c.overBudget && c["Spesa Media"] > 0).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-50 dark:bg-violet-950/50 rounded-xl">
                        <Wallet className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Budget Mensile</h2>
                        <p className="text-xs text-slate-500">Imposta limiti per categoria e confrontali con le spese reali</p>
                    </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1" /> {importResult ? "Aggiorna CSV" : "Importa CSV"}
                </Button>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleImport} />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Budget Totale</p>
                    <p className="text-xl font-extrabold text-violet-600 dark:text-violet-400 mt-1">{formatEuro(totalBudget)}</p>
                    <p className="text-[10px] text-violet-400">/mese</p>
                </div>
                <div className={`border rounded-2xl p-4 ${totalActual > totalBudget ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spesa Media</p>
                    <p className={`text-xl font-extrabold mt-1 ${totalActual > totalBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                        {importResult ? formatEuro(totalActual) : "—"}
                    </p>
                    <p className="text-[10px] text-slate-400">/mese</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categorie Oltre</p>
                    <p className="text-xl font-extrabold text-slate-700 dark:text-slate-300 mt-1">{importResult ? overBudgetCount : "—"}</p>
                    <p className="text-[10px] text-slate-400">su {categories.length}</p>
                </div>
            </div>

            {/* Category Budget List */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl">
                <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">Budget per Categoria</h3>
                    <div className="space-y-2">
                        {comparisonData.map((item, idx) => {
                            const pct = item.Budget > 0 ? Math.min(100, (item["Spesa Media"] / item.Budget) * 100) : 0;
                            const isEditing = editingIdx === idx;

                            return (
                                <div key={item.name} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {item.overBudget && item["Spesa Media"] > 0 ? (
                                                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                            ) : item["Spesa Media"] > 0 ? (
                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : null}
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isEditing ? (
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        value={editLimit}
                                                        onChange={e => setEditLimit(e.target.value)}
                                                        className="h-6 w-20 text-xs rounded-lg"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => saveEdit(idx)} className="text-emerald-500 hover:text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => setEditingIdx(null)} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {importResult && (
                                                        <span className={`text-xs font-bold ${item.overBudget ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {formatEuro(item["Spesa Media"])}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-400">/ {formatEuro(item.Budget)}</span>
                                                    <button onClick={() => startEdit(idx)} className="text-slate-300 hover:text-blue-500"><Pencil className="w-3 h-3" /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {importResult && (
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${item.overBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
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

            {/* Comparison Chart */}
            {importResult && (
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl">
                    <CardContent className="p-5">
                        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">Budget vs Spesa Reale</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => `${v}`} />
                                    <Tooltip
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value: any) => formatEuro(Number(value))}
                                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
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
                <div className="text-center py-8 text-slate-400 text-sm">
                    Importa un estratto conto CSV per confrontare le tue spese reali con il budget.
                </div>
            )}
        </div>
    );
}
