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
        <Card className="mt-8 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_55px_-35px_rgba(15,23,42,0.42)] sm:bg-white/90 sm:backdrop-blur-xl">
            <CardHeader className="border-b border-slate-200/80 bg-slate-50/85 px-4 py-4 sm:bg-white/70 sm:px-6">
                <CardTitle className="text-base font-bold text-slate-900 sm:text-lg">
                    Dettaglio Snapshot
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-0">
                <div className="space-y-3 sm:hidden">
                    {history.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200/85 bg-slate-50/85 p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Data</div>
                                    <div className="mt-1 text-sm font-semibold text-slate-900">{format(parseISO(item.date), "dd/MM/yyyy")}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(item)}
                                        className="h-10 w-10 rounded-full text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                                        aria-label="Modifica snapshot"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onDelete(item.id)}
                                        className="h-10 w-10 rounded-full text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                                        aria-label="Elimina snapshot"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Immobili</div>
                                    <div className="mt-1 font-semibold text-slate-800">{formatEuro(item.realEstateValue)}</div>
                                </div>
                                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Liquidita</div>
                                    <div className="mt-1 font-semibold text-slate-800">{formatEuro((item.liquidStockValue || 0) + (item.stocksSnapshotValue || 0))}</div>
                                </div>
                                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bitcoin</div>
                                    <div className="mt-1 font-semibold text-slate-800">{item.bitcoinAmount} BTC</div>
                                    <div className="mt-1 text-xs text-slate-500">@{formatEuro(item.bitcoinPrice)}</div>
                                </div>
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 shadow-sm">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Totale</div>
                                    <div className="mt-1 font-bold text-emerald-600">{formatEuro(item.totalNetWorth || 0)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b border-slate-200/80 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/70">
                            <tr>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Data</th>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Immobili</th>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Liquidita</th>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Bitcoin</th>
                                <th className="px-4 py-4 font-bold tracking-wider text-slate-700 dark:text-slate-300 sm:px-6">Totale</th>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                            {history.map(item => (
                                <tr key={item.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100 sm:px-6">
                                        {format(parseISO(item.date), "dd/MM/yyyy")}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600 dark:text-slate-400 sm:px-6">{formatEuro(item.realEstateValue)}</td>
                                    <td className="px-4 py-4 text-slate-600 dark:text-slate-400 sm:px-6">{formatEuro((item.liquidStockValue || 0) + (item.stocksSnapshotValue || 0))}</td>
                                    <td className="px-4 py-4 text-slate-600 dark:text-slate-400 sm:px-6">
                                        <span className="font-medium">{item.bitcoinAmount} BTC</span>
                                        <br />
                                        <span className="text-xs text-slate-400 dark:text-slate-500">@{formatEuro(item.bitcoinPrice)}</span>
                                    </td>
                                    <td className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400 sm:px-6">
                                        {formatEuro(item.totalNetWorth || 0)}
                                    </td>
                                    <td className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(item)}
                                                className="h-10 w-10 rounded-full text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/50"
                                                aria-label="Modifica snapshot"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDelete(item.id)}
                                                className="h-10 w-10 rounded-full text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/50"
                                                aria-label="Elimina snapshot"
                                            >
                                                <Trash2 className="h-4 w-4" />
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
