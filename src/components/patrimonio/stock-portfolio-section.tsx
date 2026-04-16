"use client";

import { memo, useState, useMemo, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Switch } from "@/components/ui/switch";
import { Wallet, Plus, Trash2, ShieldCheck, TrendingUp, Loader2, Banknote, HelpCircle, Receipt } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { OwnerFilterBar, OwnerBadgeSelect, type OwnerFilter } from "@/components/patrimonio/owner-filter";
import { SaleTaxModal } from "@/components/patrimonio/sale-tax-modal";
import type { AssetOwner, CustomStock } from "@/types";

/** Compute effective total value for a stock, preferring manualValue over price*shares */
function effectiveStockValue(s: CustomStock): number {
    if (s.manualValue !== undefined && s.manualValue > 0) return s.manualValue;
    return (s.currentPrice || 0) * s.shares;
}

interface StockPortfolioSectionProps {
    customStocksList: CustomStock[];
    liquidStockValue: number;
    emergencyFund: number;
    separateEmergencyFund: boolean;
    person1Name: string;
    person2Name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchResults: any[];
    activeSearchIdx: number | null;
    isSearching: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    portfolioHistory: any[];
    isFetchingHistory: boolean;
    onStocksListChange: (list: CustomStock[]) => void;
    onLiquidStockValueChange: (v: number) => void;
    onEmergencyFundChange: (v: number) => void;
    onToggleSeparateEmergencyFund: (v: boolean) => void;
    onSearchStocks: (query: string, index: number) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSelectStock: (stock: CustomStock, suggestion: any) => void;
    onTriggerSave: () => void;
}

export const StockPortfolioSection = memo(function StockPortfolioSection({
    customStocksList, liquidStockValue, emergencyFund, separateEmergencyFund,
    person1Name, person2Name,
    searchResults, activeSearchIdx, isSearching,
    portfolioHistory, isFetchingHistory,
    onStocksListChange, onLiquidStockValueChange, onEmergencyFundChange,
    onToggleSeparateEmergencyFund, onSearchStocks, onSelectStock, onTriggerSave,
}: StockPortfolioSectionProps) {
    const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
    const [manualValueOpenId, setManualValueOpenId] = useState<string | null>(null);
    const [toastVisible, setToastVisible] = useState(false);
    const hasUnpricedStock = useMemo(() => customStocksList.some(s => s.ticker && !s.isLoading && !s.currentPrice), [customStocksList]);

    // Show one-time toast when a stock has no price and user hasn't seen the hint yet
    useEffect(() => {
        if (!hasUnpricedStock || toastVisible) return;
        const alreadySeen = sessionStorage.getItem("manualValueHintSeen");
        if (alreadySeen) return;
        sessionStorage.setItem("manualValueHintSeen", "1");
        const showTimer = setTimeout(() => setToastVisible(true), 0);
        const hideTimer = setTimeout(() => setToastVisible(false), 5000);
        return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
    }, [hasUnpricedStock, toastVisible]);

    const toggleManualInput = useCallback((stockId: string) => {
        setManualValueOpenId(prev => prev === stockId ? null : stockId);
    }, []);

    const person1Total = useMemo(() => customStocksList.filter(s => s.owner === "person1").reduce((acc, s) => acc + effectiveStockValue(s), 0), [customStocksList]);
    const person2Total = useMemo(() => customStocksList.filter(s => s.owner === "person2").reduce((acc, s) => acc + effectiveStockValue(s), 0), [customStocksList]);

    const filteredStocks = useMemo(() => {
        if (ownerFilter === "all") return customStocksList;
        return customStocksList.filter(s => s.owner === ownerFilter);
    }, [customStocksList, ownerFilter]);

    // Map filtered index to original index for search
    const getOriginalIndex = (filteredIdx: number) => {
        const stock = filteredStocks[filteredIdx];
        return customStocksList.findIndex(s => s.id === stock.id);
    };

    return (
        <>
            <Card className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_55px_-35px_rgba(15,23,42,0.42)] sm:bg-white/90 sm:backdrop-blur-xl">
                <CardHeader className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/85 p-4 sm:flex-row sm:items-center sm:justify-between sm:bg-white/70 sm:p-6">
                    <CardTitle className="flex items-center text-lg text-slate-900">
                        <Wallet className="mr-3 h-5 w-5 text-purple-600" /> Liquidita & Titoli
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 p-4 sm:p-6">
                    {toastVisible && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-300 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            <div className="flex items-start gap-2">
                                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>Ticker non trovato? Clicca sul <strong>?</strong> accanto al titolo per inserire il controvalore manualmente.</span>
                            </div>
                        </div>
                    )}
                    {customStocksList.length > 0 && (
                        <OwnerFilterBar
                            value={ownerFilter}
                            onChange={setOwnerFilter}
                            person1Name={person1Name}
                            person2Name={person2Name}
                            person1Total={person1Total}
                            person2Total={person2Total}
                            formatValue={formatEuro}
                        />
                    )}

                    <div className="space-y-4">
                        {filteredStocks.map((stock, filteredIdx) => {
                            const idx = getOriginalIndex(filteredIdx);
                            return (
                            <div key={stock.id} className="relative rounded-2xl border border-slate-200/85 bg-slate-50/85 p-3 shadow-sm transition-all hover:shadow-md">
                                <div className="mb-2">
                                    <OwnerBadgeSelect
                                        value={stock.owner}
                                        onChange={(owner: AssetOwner) => {
                                            onStocksListChange(customStocksList.map(s => s.id === stock.id ? { ...s, owner } : s));
                                            onTriggerSave();
                                        }}
                                        person1Name={person1Name}
                                        person2Name={person2Name}
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_110px_120px_auto] sm:items-center">
                                    <div className="space-y-1 relative">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ticker Azione/ETF</Label>
                                        <Input
                                            value={stock.ticker}
                                            onChange={e => {
                                                const newVal = e.target.value.toUpperCase();
                                                onStocksListChange(customStocksList.map(s => s.id === stock.id ? { ...s, ticker: newVal } : s));
                                                onSearchStocks(newVal, idx);
                                            }}
                                            onFocus={() => { if (stock.ticker.length >= 2) onSearchStocks(stock.ticker, idx); }}
                                            placeholder="Es. VWCE.DE"
                                            className="h-11 font-mono text-sm font-bold uppercase text-slate-900 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                                        />

                                        {activeSearchIdx === idx && (searchResults.length > 0 || isSearching) && (
                                            <div className="absolute left-0 top-full z-[60] mt-1 max-h-72 min-w-[260px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-top-2 duration-200 dark:border-slate-700 dark:bg-slate-900">
                                                {isSearching && searchResults.length === 0 ? (
                                                    <div className="flex items-center gap-2 p-3 text-xs text-slate-500 dark:text-slate-400">
                                                        <Loader2 className="h-3 w-3 animate-spin" /> Cerco su vari mercati...
                                                    </div>
                                                ) : (
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    searchResults.map((res: any) => (
                                                        <button
                                                            key={res.symbol}
                                                            className="w-full border-b border-slate-100 p-3 text-left transition-colors hover:bg-purple-50 dark:border-slate-800 dark:hover:bg-purple-950/30"
                                                            onClick={() => onSelectStock(stock, res)}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{res.symbol}</div>
                                                                <div className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{res.exchDisp}</div>
                                                            </div>
                                                            <div className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{res.name}</div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quote</Label>
                                        <Input
                                            type="number"
                                            value={stock.shares}
                                            onChange={e => {
                                                onStocksListChange(customStocksList.map(s => s.id === stock.id ? { ...s, shares: Number(e.target.value) } : s));
                                            }}
                                            onBlur={onTriggerSave}
                                            className="h-11 border-purple-200 bg-purple-50 text-sm font-bold text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300"
                                        />
                                    </div>

                                    <div className="space-y-1 sm:text-right">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live & Totale</Label>
                                        <div className="flex h-11 flex-col justify-center sm:items-end">
                                            {stock.isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                                            ) : (
                                                <>
                                                    {stock.currentPrice ? (
                                                        <>
                                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatEuro(stock.currentPrice)}</div>
                                                            <div className="mt-1 inline-flex w-fit rounded-full border border-purple-200 bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-300">
                                                                {formatEuro(stock.currentPrice * stock.shares)}
                                                            </div>
                                                        </>
                                                    ) : stock.ticker ? (
                                                        <>
                                                            <button
                                                                onClick={() => toggleManualInput(stock.id)}
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                                                                title="Clicca per inserire il controvalore manualmente"
                                                            >
                                                                <HelpCircle className="h-3.5 w-3.5" />
                                                                {stock.manualValue ? formatEuro(stock.manualValue) : "Inserisci valore"}
                                                            </button>
                                                            {manualValueOpenId === stock.id && (
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Controvalore €"
                                                                    value={stock.manualValue || ""}
                                                                    onChange={e => {
                                                                        const val = Number(e.target.value);
                                                                        onStocksListChange(customStocksList.map(s => s.id === stock.id ? { ...s, manualValue: val || undefined } : s));
                                                                    }}
                                                                    onBlur={onTriggerSave}
                                                                    autoFocus
                                                                    className="mt-1 h-8 w-28 border-amber-300 bg-amber-50 text-xs font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                                                />
                                                            )}
                                                            {stock.manualValue !== undefined && stock.manualValue > 0 && (
                                                                <div className="mt-1 inline-flex w-fit rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                                                                    {formatEuro(stock.manualValue)}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : null}
                                                    {stock.dividendYield !== undefined && stock.dividendYield > 0 && (
                                                        <div className="mt-1 inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-[9px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                                                            Div {(stock.dividendYield * 100).toFixed(1)}%
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {stock.ticker && stock.shares > 0 && (stock.currentPrice ?? 0) > 0 && (
                                        <SaleTaxModal
                                            ticker={stock.ticker}
                                            defaultShares={stock.shares}
                                            defaultCurrentPrice={stock.currentPrice}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-11 w-11 justify-self-start rounded-full text-violet-500 transition-colors hover:bg-violet-50 hover:text-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/50"
                                                    aria-label="Simula vendita"
                                                    title="Simula impatto fiscale vendita"
                                                >
                                                    <Receipt className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-11 w-11 justify-self-start rounded-full text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/50 sm:justify-self-end"
                                        onClick={() => {
                                            onStocksListChange(customStocksList.filter(s => s.id !== stock.id));
                                            onTriggerSave();
                                        }}
                                        aria-label="Rimuovi titolo"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            );
                        })}

                        {customStocksList.length === 0 && (
                            <div className="mb-4 rounded-2xl border border-purple-200 bg-purple-50/90 p-4 shadow-sm dark:border-purple-900 dark:bg-purple-950/30">
                                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                    Aggiungi i tuoi ETF o Azioni per tracciarne il valore in tempo reale. In alternativa, usa il campo Liquidita qui sotto per inserire il totale manualmente.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {separateEmergencyFund ? "Liquidita Immediata (Conto Corrente)" : "Liquidita / Fondo Emergenza"}
                                </Label>
                                <Input
                                    type="number"
                                    value={liquidStockValue}
                                    onChange={e => onLiquidStockValueChange(Number(e.target.value))}
                                    onBlur={onTriggerSave}
                                    className={separateEmergencyFund
                                        ? "h-11 border-slate-200 bg-white/80 text-lg text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                                        : "h-11 border-emerald-200 bg-emerald-50 text-lg font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                                    }
                                />
                                <p className="text-[10px] text-slate-400 dark:text-slate-400">
                                    {separateEmergencyFund
                                        ? "Saldo del conto corrente, separato dal fondo emergenza."
                                        : "Questa liquidita include il fondo emergenza e fa parte dell'Indice di Sopravvivenza."}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-11 rounded-xl border-2 border-dashed border-purple-300 bg-transparent px-4 text-purple-600 transition-all hover:bg-purple-50 hover:text-purple-700 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-400 dark:hover:bg-purple-950/50"
                                onClick={() => {
                                    onStocksListChange([...customStocksList, { id: Date.now().toString(), ticker: "", shares: 1, owner: ownerFilter !== "all" ? ownerFilter : "person1" }]);
                                }}
                            >
                                <Plus className="mr-1 h-3 w-3" /> Aggiungi Azione/ETF Live
                            </Button>
                            {customStocksList.length > 0 && (
                                <div className="text-left sm:text-right">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        {ownerFilter === "all" ? "Totale Azionario" : `Totale ${ownerFilter === "person1" ? person1Name : person2Name}`}
                                    </div>
                                    <div className="text-lg font-extrabold text-purple-600 dark:text-purple-400">
                                        {formatEuro(filteredStocks.reduce((acc, s) => acc + effectiveStockValue(s), 0))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {(() => {
                        const stocksWithDividends = customStocksList.filter(s => s.annualDividend && s.annualDividend > 0 && s.shares > 0);
                        if (stocksWithDividends.length === 0) return null;
                        const totalAnnualDividends = stocksWithDividends.reduce((acc, s) => acc + (s.annualDividend || 0) * s.shares, 0);
                        const totalPortfolioValue = customStocksList.reduce((acc, s) => acc + effectiveStockValue(s), 0);
                        const weightedYield = totalPortfolioValue > 0 ? (totalAnnualDividends / totalPortfolioValue) * 100 : 0;
                        return (
                            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 pt-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                    <Banknote className="h-4 w-4" /> Reddito da Dividendi
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div className="text-center">
                                        <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Annuo Stimato</div>
                                        <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{formatEuro(totalAnnualDividends)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Mensile</div>
                                        <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{formatEuro(totalAnnualDividends / 12)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Yield Medio</div>
                                        <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{weightedYield.toFixed(2)}%</div>
                                    </div>
                                </div>
                                {stocksWithDividends.length > 1 && (
                                    <div className="space-y-1 border-t border-emerald-200 pt-2 dark:border-emerald-800">
                                        {stocksWithDividends.map(s => (
                                            <div key={s.id} className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400">
                                                <span className="font-bold">{s.ticker}</span>
                                                <span>{formatEuro((s.annualDividend || 0) * s.shares)}/anno ({((s.dividendYield || 0) * 100).toFixed(1)}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                                <ShieldCheck className="mr-1 h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Fondo Emergenza Separato
                            </Label>
                            <Switch
                                checked={separateEmergencyFund}
                                onCheckedChange={onToggleSeparateEmergencyFund}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400">
                            {separateEmergencyFund
                                ? "Il fondo emergenza e' separato dalla liquidita del conto corrente."
                                : "Liquidita e fondo emergenza sono un unico importo (campo sopra)."}
                        </p>
                        {separateEmergencyFund && (
                            <Input
                                type="number"
                                value={emergencyFund}
                                onChange={e => onEmergencyFundChange(Number(e.target.value))}
                                onBlur={onTriggerSave}
                                className="h-11 border-emerald-200 bg-emerald-50 text-lg font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {customStocksList.filter(s => s.ticker && s.shares > 0).length > 0 && (
                <Card className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_55px_-35px_rgba(15,23,42,0.42)] sm:bg-white/90 sm:backdrop-blur-xl">
                    <CardHeader className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/85 p-4 sm:flex-row sm:items-center sm:justify-between sm:bg-white/70 sm:p-6">
                        <div>
                            <CardTitle className="flex items-center text-lg text-slate-900">
                                <TrendingUp className="mr-3 h-5 w-5 text-purple-600" /> Simulazione Portafoglio (Ultimi 5 Anni)
                            </CardTitle>
                            <CardDescription className="mt-1 text-xs text-slate-500">
                                Rendimento passato dei tuoi ETF attuali, ipotizzando le stesse quote di oggi.
                            </CardDescription>
                        </div>
                        {isFetchingHistory && <Loader2 className="h-5 w-5 animate-spin text-purple-400" />}
                    </CardHeader>
                    <CardContent className="h-64 p-3 sm:h-72 sm:p-6">
                        {portfolioHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={portfolioHistory} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} tickMargin={8} interval="preserveStartEnd" minTickGap={16} />
                                    <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: "14px", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 10px 40px -10px rgba(15,23,42,0.18)", backgroundColor: "rgba(255,255,255,0.96)", backdropFilter: "blur(10px)", padding: "12px", color: "#334155" }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value: any) => [<span key="value" className="font-extrabold text-purple-600">{formatEuro(Number(value || 0))}</span>, "Valore Virtuale"]}
                                        labelStyle={{ color: "#475569", fontWeight: 700, marginBottom: "8px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                    />
                                    <Area type="monotone" dataKey="Valore" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorValore)" className="drop-shadow-[0_4px_12px_rgba(168,85,247,0.3)]" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center text-slate-400">
                                {!isFetchingHistory && <p className="text-sm">Nessuno storico disponibile o in fase di caricamento.</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </>
    );
});
