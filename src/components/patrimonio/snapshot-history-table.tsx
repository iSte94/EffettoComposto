"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatEuro } from "@/lib/format";
import type { AssetRecord } from "@/types";

interface SnapshotHistoryTableProps {
    history: AssetRecord[];
    onEdit: (item: AssetRecord) => void;
    onDelete: (id: string) => void;
}

export const SnapshotHistoryTable = memo(function SnapshotHistoryTable({ history, onEdit, onDelete }: SnapshotHistoryTableProps) {
    if (history.length === 0) return null;

    return (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-xl rounded-3xl overflow-hidden mt-8">
            <CardHeader className="border-b border-white dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 p-6">
                <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Dettaglio Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-white/50 dark:bg-slate-800/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold tracking-wider">Data</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Immobili</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Liquidità</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Bitcoin</th>
                                <th className="px-6 py-4 font-bold tracking-wider text-slate-700 dark:text-slate-300">Totale</th>
                                <th className="px-6 py-4 font-bold tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {history.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{format(parseISO(item.date), "dd/MM/yyyy")}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatEuro(item.realEstateValue)}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatEuro(item.liquidStockValue)}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{item.bitcoinAmount} BTC <br /><span className="text-xs text-slate-400 dark:text-slate-400">@{formatEuro(item.bitcoinPrice)}</span></td>
                                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">{formatEuro(item.totalNetWorth || 0)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="text-blue-500 hover:text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-all rounded-full">
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="text-rose-500 hover:text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-all rounded-full">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
});
