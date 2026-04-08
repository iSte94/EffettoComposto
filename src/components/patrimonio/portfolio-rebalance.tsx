"use client";

import { memo, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { formatEuro } from "@/lib/format";

interface PortfolioRebalanceProps {
    stockValue: number;
    realEstateValue: number;
    cryptoValue: number;
    cashValue: number;
    bondValue: number;
}

interface AllocationTarget {
    name: string;
    target: number;
    actual: number;
    value: number;
    color: string;
}

export const PortfolioRebalance = memo(function PortfolioRebalance({
    stockValue, realEstateValue, cryptoValue, cashValue, bondValue,
}: PortfolioRebalanceProps) {
    const [targetStocks, setTargetStocks] = useState(60);
    const [targetBonds, setTargetBonds] = useState(15);
    const [targetCash, setTargetCash] = useState(10);
    const [targetCrypto, setTargetCrypto] = useState(5);
    const [targetRealEstate, setTargetRealEstate] = useState(10);

    const totalValue = stockValue + realEstateValue + cryptoValue + cashValue + bondValue;

    const allocations = useMemo((): AllocationTarget[] => {
        if (totalValue === 0) return [];
        return [
            { name: "Azioni/ETF", target: targetStocks, actual: (stockValue / totalValue) * 100, value: stockValue, color: "purple" },
            { name: "Obbligazioni", target: targetBonds, actual: (bondValue / totalValue) * 100, value: bondValue, color: "blue" },
            { name: "Liquidita", target: targetCash, actual: (cashValue / totalValue) * 100, value: cashValue, color: "emerald" },
            { name: "Crypto", target: targetCrypto, actual: (cryptoValue / totalValue) * 100, value: cryptoValue, color: "amber" },
            { name: "Immobili", target: targetRealEstate, actual: (realEstateValue / totalValue) * 100, value: realEstateValue, color: "slate" },
        ];
    }, [totalValue, stockValue, bondValue, cashValue, cryptoValue, realEstateValue, targetStocks, targetBonds, targetCash, targetCrypto, targetRealEstate]);

    const targetSum = targetStocks + targetBonds + targetCash + targetCrypto + targetRealEstate;

    if (totalValue === 0) {
        return (
            <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                <CardContent className="p-6 text-center text-slate-400 dark:text-slate-500">
                    <RefreshCw className="mx-auto mb-2 h-10 w-10 opacity-50" />
                    <p className="text-sm">Aggiungi asset nel patrimonio per vedere i suggerimenti di ribilanciamento.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
            <CardContent className="space-y-5 p-4 sm:p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                    <RefreshCw className="h-5 w-5 text-indigo-500" /> Ribilanciamento Portafoglio
                </h3>

                {targetSum !== 100 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-center text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                        La somma dei target e {targetSum}% (dovrebbe essere 100%)
                    </div>
                )}

                <div className="space-y-4">
                    {[
                        { label: "Azioni/ETF", value: targetStocks, onChange: setTargetStocks, color: "text-purple-600 dark:text-purple-400" },
                        { label: "Obbligazioni", value: targetBonds, onChange: setTargetBonds, color: "text-blue-600 dark:text-blue-400" },
                        { label: "Liquidita", value: targetCash, onChange: setTargetCash, color: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Crypto", value: targetCrypto, onChange: setTargetCrypto, color: "text-amber-600 dark:text-amber-400" },
                        { label: "Immobili", value: targetRealEstate, onChange: setTargetRealEstate, color: "text-slate-600 dark:text-slate-400" },
                    ].map(item => (
                        <div key={item.label} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Label className={`w-auto text-xs font-bold sm:w-28 ${item.color}`}>{item.label}</Label>
                            <Slider value={[item.value]} min={0} max={100} step={5} onValueChange={v => item.onChange(v[0])} className="flex-1" />
                            <div className="flex items-center gap-2 sm:w-24">
                                <Input
                                    type="number"
                                    value={item.value}
                                    onChange={e => item.onChange(Number(e.target.value))}
                                    className="h-10 w-full rounded-xl border-slate-200 bg-transparent text-right font-mono text-sm font-bold dark:border-slate-700"
                                />
                                <span className="w-3 text-[10px] text-slate-400">%</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-2 border-t border-slate-200/80 pt-4 dark:border-slate-800">
                    <div className="grid grid-cols-12 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <div className="col-span-4">Asset</div>
                        <div className="col-span-2 text-right">Attuale</div>
                        <div className="col-span-2 text-right">Target</div>
                        <div className="col-span-2 text-right">Diff %</div>
                        <div className="col-span-2 text-right">Azione</div>
                    </div>
                    {allocations.map(a => {
                        const diff = a.target - a.actual;
                        const diffValue = (diff / 100) * totalValue;
                        const isOver = diff < -1;
                        const isUnder = diff > 1;

                        return (
                            <div
                                key={a.name}
                                className={`grid grid-cols-12 items-center gap-2 rounded-xl p-3 text-sm ${isOver
                                    ? "bg-red-50/70 dark:bg-red-950/20"
                                    : isUnder
                                        ? "bg-emerald-50/70 dark:bg-emerald-950/20"
                                        : "bg-slate-50/70 dark:bg-slate-800/40"}`}
                            >
                                <div className="col-span-4 text-xs font-bold text-slate-700 dark:text-slate-300">{a.name}</div>
                                <div className="col-span-2 text-right font-mono text-xs text-slate-600 dark:text-slate-400">{a.actual.toFixed(1)}%</div>
                                <div className="col-span-2 text-right font-mono text-xs text-slate-600 dark:text-slate-400">{a.target}%</div>
                                <div className={`col-span-2 text-right font-mono text-xs font-bold ${isOver ? "text-red-500" : isUnder ? "text-emerald-500" : "text-slate-400"}`}>
                                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    {isUnder && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            <ArrowUp className="h-3 w-3" /> Compra {formatEuro(Math.abs(diffValue))}
                                        </span>
                                    )}
                                    {isOver && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                                            <ArrowDown className="h-3 w-3" /> Vendi {formatEuro(Math.abs(diffValue))}
                                        </span>
                                    )}
                                    {!isOver && !isUnder && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <Minus className="h-3 w-3" /> OK
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="pt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
                    I suggerimenti sono indicativi. Considera costi di transazione e implicazioni fiscali prima di ribilanciare.
                </p>
            </CardContent>
        </Card>
    );
});
