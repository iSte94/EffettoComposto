"use client";

import { memo, useState, useMemo } from "react";
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
            { name: "Liquidità", target: targetCash, actual: (cashValue / totalValue) * 100, value: cashValue, color: "emerald" },
            { name: "Crypto", target: targetCrypto, actual: (cryptoValue / totalValue) * 100, value: cryptoValue, color: "amber" },
            { name: "Immobili", target: targetRealEstate, actual: (realEstateValue / totalValue) * 100, value: realEstateValue, color: "slate" },
        ];
    }, [totalValue, stockValue, bondValue, cashValue, cryptoValue, realEstateValue, targetStocks, targetBonds, targetCash, targetCrypto, targetRealEstate]);

    const targetSum = targetStocks + targetBonds + targetCash + targetCrypto + targetRealEstate;

    if (totalValue === 0) {
        return (
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden">
                <CardContent className="p-6 text-center text-slate-400">
                    <RefreshCw className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aggiungi asset nel patrimonio per vedere i suggerimenti di ribilanciamento.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-indigo-500" /> Ribilanciamento Portafoglio
                </h3>

                {targetSum !== 100 && (
                    <div className="p-2 bg-amber-50/80 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300 font-medium text-center">
                        La somma dei target e {targetSum}% (dovrebbe essere 100%)
                    </div>
                )}

                {/* Target sliders */}
                <div className="space-y-3">
                    {[
                        { label: "Azioni/ETF", value: targetStocks, onChange: setTargetStocks, color: "text-purple-600 dark:text-purple-400" },
                        { label: "Obbligazioni", value: targetBonds, onChange: setTargetBonds, color: "text-blue-600 dark:text-blue-400" },
                        { label: "Liquidità", value: targetCash, onChange: setTargetCash, color: "text-emerald-600 dark:text-emerald-400" },
                        { label: "Crypto", value: targetCrypto, onChange: setTargetCrypto, color: "text-amber-600 dark:text-amber-400" },
                        { label: "Immobili", value: targetRealEstate, onChange: setTargetRealEstate, color: "text-slate-600 dark:text-slate-400" },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-3">
                            <Label className={`text-xs font-bold w-24 ${item.color}`}>{item.label}</Label>
                            <Slider value={[item.value]} min={0} max={100} step={5}
                                onValueChange={v => item.onChange(v[0])} className="flex-1" />
                            <Input type="number" value={item.value} onChange={e => item.onChange(Number(e.target.value))}
                                className="w-16 h-7 text-xs text-right font-mono font-bold bg-transparent border-slate-200 dark:border-slate-700 rounded-lg" />
                            <span className="text-[10px] text-slate-400 w-3">%</span>
                        </div>
                    ))}
                </div>

                {/* Actual vs Target comparison */}
                <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                        <div className="col-span-3">Asset</div>
                        <div className="col-span-2 text-right">Attuale</div>
                        <div className="col-span-2 text-right">Target</div>
                        <div className="col-span-2 text-right">Diff %</div>
                        <div className="col-span-3 text-right">Azione</div>
                    </div>
                    {allocations.map(a => {
                        const diff = a.target - a.actual;
                        const diffValue = (diff / 100) * totalValue;
                        const isOver = diff < -1;
                        const isUnder = diff > 1;
                        return (
                            <div key={a.name} className={`grid grid-cols-12 items-center p-2 rounded-lg text-sm ${isOver ? "bg-red-50/50 dark:bg-red-950/20" : isUnder ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-slate-50/50 dark:bg-slate-800/30"}`}>
                                <div className="col-span-3 font-bold text-slate-700 dark:text-slate-300 text-xs">{a.name}</div>
                                <div className="col-span-2 text-right font-mono text-xs text-slate-600 dark:text-slate-400">{a.actual.toFixed(1)}%</div>
                                <div className="col-span-2 text-right font-mono text-xs text-slate-600 dark:text-slate-400">{a.target}%</div>
                                <div className={`col-span-2 text-right font-mono text-xs font-bold ${isOver ? "text-red-500" : isUnder ? "text-emerald-500" : "text-slate-400"}`}>
                                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                                </div>
                                <div className="col-span-3 text-right flex items-center justify-end gap-1">
                                    {isUnder && (
                                        <>
                                            <ArrowUp className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Compra {formatEuro(Math.abs(diffValue))}</span>
                                        </>
                                    )}
                                    {isOver && (
                                        <>
                                            <ArrowDown className="w-3 h-3 text-red-500" />
                                            <span className="text-[10px] font-bold text-red-500">Vendi {formatEuro(Math.abs(diffValue))}</span>
                                        </>
                                    )}
                                    {!isOver && !isUnder && (
                                        <>
                                            <Minus className="w-3 h-3 text-slate-400" />
                                            <span className="text-[10px] text-slate-400">OK</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <p className="text-[9px] text-slate-400 text-center pt-2">
                    I suggerimenti sono indicativi. Considera costi di transazione e implicazioni fiscali prima di ribilanciare.
                </p>
            </CardContent>
        </Card>
    );
});
