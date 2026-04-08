"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { parseBankCSV, type ImportResult } from "@/lib/import/bank-csv";
import { formatEuro } from "@/lib/format";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

interface BankImportModalProps {
    onImportBalance?: (balance: number) => void;
    onImportMonthlySavings?: (savings: number) => void;
}

export function BankImportModal({ onImportBalance, onImportMonthlySavings }: BankImportModalProps) {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);
        setResult(null);

        try {
            const text = await file.text();
            const parsed = parseBankCSV(text);
            if (parsed.transactions.length === 0) {
                setError("Nessuna transazione trovata. Verifica il formato del file CSV.");
                return;
            }
            setResult(parsed);
        } catch {
            setError("Errore nella lettura del file. Assicurati che sia un file CSV valido.");
        }
    };

    const handleApplyBalance = () => {
        if (result?.currentBalance && onImportBalance) {
            onImportBalance(result.currentBalance);
            setOpen(false);
        }
    };

    const handleApplySavings = () => {
        if (result && result.monthlySummary.length > 0 && onImportMonthlySavings) {
            const avgNet = result.monthlySummary.reduce((s, m) => s + m.net, 0) / result.monthlySummary.length;
            onImportMonthlySavings(Math.round(avgNet));
            setOpen(false);
        }
    };

    const chartData = result?.monthlySummary.map(m => ({
        mese: m.month.substring(5), // MM only
        Entrate: Math.round(m.income),
        Uscite: Math.round(m.expenses),
        Netto: Math.round(m.net),
    }));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl text-xs">
                    <Upload className="w-3.5 h-3.5 mr-1" /> Importa CSV Banca
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                        Importa Estratto Conto CSV
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Upload Zone */}
                    <div
                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                        onClick={() => fileRef.current?.click()}
                    >
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-3" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Clicca per caricare il file CSV
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Supporta: Fineco, Intesa Sanpaolo, Unicredit, formato generico
                        </p>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,.tsv,.txt"
                            className="hidden"
                            onChange={handleFile}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-sm">
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="text-emerald-700 dark:text-emerald-300">
                                    {result.transactions.length} transazioni importate da <strong>{result.detectedBank}</strong>
                                </span>
                            </div>

                            {/* KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transazioni</p>
                                    <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{result.transactions.length}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Totale Entrate</p>
                                    <p className="text-lg font-bold text-emerald-600">{formatEuro(result.totalIncome)}</p>
                                </div>
                                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Totale Uscite</p>
                                    <p className="text-lg font-bold text-red-600">{formatEuro(result.totalExpenses)}</p>
                                </div>
                                {result.currentBalance !== undefined && (
                                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Saldo Attuale</p>
                                        <p className="text-lg font-bold text-blue-600">{formatEuro(result.currentBalance)}</p>
                                    </div>
                                )}
                            </div>

                            {/* Monthly Chart */}
                            {chartData && chartData.length > 1 && (
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-500 mb-3">Riepilogo Mensile</h4>
                                    <div className="h-48">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                <XAxis dataKey="mese" tick={{ fontSize: 10 }} />
                                                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                                                <Tooltip
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    formatter={(value: any) => formatEuro(Number(value))}
                                                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: 10 }} />
                                                <Bar dataKey="Entrate" fill="#10b981" radius={[3, 3, 0, 0]} />
                                                <Bar dataKey="Uscite" fill="#ef4444" radius={[3, 3, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Category Breakdown */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-500 mb-3">Spese per Categoria</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {(() => {
                                        const cats = new Map<string, number>();
                                        result.transactions.filter(t => t.amount < 0).forEach(t => {
                                            cats.set(t.category || 'Altro', (cats.get(t.category || 'Altro') || 0) + Math.abs(t.amount));
                                        });
                                        return Array.from(cats.entries())
                                            .sort(([, a], [, b]) => b - a)
                                            .slice(0, 8)
                                            .map(([cat, total]) => (
                                                <div key={cat} className="flex justify-between text-xs py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                    <span className="text-slate-600 dark:text-slate-400">{cat}</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatEuro(total)}</span>
                                                </div>
                                            ));
                                    })()}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {result.currentBalance !== undefined && onImportBalance && (
                                    <Button size="sm" className="rounded-xl text-xs" onClick={handleApplyBalance}>
                                        <ArrowRight className="w-3.5 h-3.5 mr-1" />
                                        Usa {formatEuro(result.currentBalance)} come Fondo Emergenza
                                    </Button>
                                )}
                                {result.monthlySummary.length > 0 && onImportMonthlySavings && (
                                    <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={handleApplySavings}>
                                        <ArrowRight className="w-3.5 h-3.5 mr-1" />
                                        Usa risparmio medio mensile ({formatEuro(Math.round(
                                            result.monthlySummary.reduce((s, m) => s + m.net, 0) / result.monthlySummary.length
                                        ))}/mese)
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
