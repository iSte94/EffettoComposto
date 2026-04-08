"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Wallet, Plus, Trash2, ShieldCheck, TrendingUp, Loader2, Banknote } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { CustomStock } from "@/types";

interface StockPortfolioSectionProps {
    customStocksList: CustomStock[];
    liquidStockValue: number;
    emergencyFund: number;
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
    onSearchStocks: (query: string, index: number) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSelectStock: (stock: CustomStock, suggestion: any) => void;
    onTriggerSave: () => void;
}

export const StockPortfolioSection = memo(function StockPortfolioSection({
    customStocksList, liquidStockValue, emergencyFund,
    searchResults, activeSearchIdx, isSearching,
    portfolioHistory, isFetchingHistory,
    onStocksListChange, onLiquidStockValueChange, onEmergencyFundChange,
    onSearchStocks, onSelectStock, onTriggerSave,
}: StockPortfolioSectionProps) {
    return (
        <>
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500">
                <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 flex flex-row items-center justify-between p-6">
                    <CardTitle className="flex items-center text-lg text-slate-900 dark:text-slate-100">
                        <Wallet className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" /> Liquidità & Titoli
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    <div className="space-y-4">
                        {customStocksList.map((stock, idx) => (
                            <div key={stock.id} className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 relative group-hover:border-slate-300 transition-all hover:shadow-md">
                                <div className="flex gap-3 items-center w-full">
                                    <div className="flex-1 space-y-1 relative">
                                        <Label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ticker Azione/ETF</Label>
                                        <Input value={stock.ticker}
                                            onChange={e => {
                                                const newVal = e.target.value.toUpperCase();
                                                onStocksListChange(customStocksList.map(s => s.id === stock.id ? { ...s, ticker: newVal } : s));
                                                onSearchStocks(newVal, idx);
                                            }}
                                            onFocus={() => { if (stock.ticker.length >= 2) onSearchStocks(stock.ticker, idx); }}
                                            placeholder="Es. VWCE.DE"
                                            className="h-8 font-mono font-bold text-sm uppercase bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 focus-visible:ring-purple-500" />

                                        {activeSearchIdx === idx && (searchResults.length > 0 || isSearching) && (
                                            <div className="absolute z-[60] left-0 min-w-[260px] md:min-w-[300px] top-full mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden max-h-72 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                                                {isSearching && searchResults.length === 0 ? (
                                                    <div className="p-3 text-xs text-slate-500 flex items-center gap-2">
                                                        <Loader2 className="w-3 h-3 animate-spin" /> Cerco su vari mercati...
                                                    </div>
                                                ) : (
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    searchResults.map((res: any) => (
                                                        <div key={res.symbol}
                                                            className="p-3 hover:bg-purple-50 dark:bg-purple-950/50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                                            onClick={() => onSelectStock(stock, res)}>
                                                            <div className="flex justify-between items-start">
                                                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{res.symbol}</div>
                                                                <div className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{res.exchDisp}</div>
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 truncate mt-0.5">{res.name}</div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-1/4 space-y-1">
                                        <Label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Quote</Label>
                                        <Input type="number" value={stock.shares} onChange={e => {
                                            onStocksListChange(customStocksList.map(s => s.id === stock.id ? { ...s, shares: Number(e.target.value) } : s));
                                        }} onBlur={onTriggerSave} className="h-8 text-sm bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300 font-bold focus-visible:ring-purple-500" />
                                    </div>
                                    <div className="w-1/3 space-y-1 text-right">
                                        <Label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Live & Totale</Label>
                                        <div className="flex flex-col items-end justify-center h-8">
                                            {stock.isLoading ? <Loader2 className="w-3 h-3 animate-spin text-purple-400" /> : (
                                                <>
                                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{stock.currentPrice ? formatEuro(stock.currentPrice) : (stock.ticker ? '?' : '')}</div>
                                                    {stock.currentPrice && (
                                                        <div className="text-[10px] bg-purple-100 text-purple-700 dark:text-purple-300 px-1.5 rounded-full border border-purple-200 dark:border-purple-900">
                                                            {formatEuro(stock.currentPrice * stock.shares)}
                                                        </div>
                                                    )}
                                                    {stock.dividendYield !== undefined && stock.dividendYield > 0 && (
                                                        <div className="text-[9px] bg-emerald-100 text-emerald-700 dark:text-emerald-300 px-1.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                                                            Div {(stock.dividendYield * 100).toFixed(1)}%
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-all font-bold" onClick={() => {
                                        onStocksListChange(customStocksList.filter(s => s.id !== stock.id));
                                        onTriggerSave();
                                    }}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {customStocksList.length === 0 && (
                            <div className="p-4 bg-purple-50 dark:bg-purple-950/50 rounded-2xl border border-purple-200 dark:border-purple-900 mb-4 shadow-sm">
                                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Aggiungi i tuoi ETF o Azioni per tracciarne il valore in tempo reale. In alternativa, usa il campo Liquidità qui sotto per inserire il totale manualmente.</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2 pb-4 border-b border-slate-100">
                                <Label className="text-slate-500 text-xs uppercase font-bold tracking-wider">Liquidità Immediata (Conto Corrente)</Label>
                                <Input type="number" value={liquidStockValue} onChange={e => onLiquidStockValueChange(Number(e.target.value))} onBlur={onTriggerSave} className="text-lg bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 focus-visible:ring-purple-500" />
                                <p className="text-[10px] text-slate-400 dark:text-slate-400">Questa liquidita&apos; fa parte dell&apos;Indice di Sopravvivenza.</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <Button variant="outline" size="sm" className="bg-transparent border-dashed border-2 border-purple-300 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:bg-purple-950/50 hover:border-purple-400 text-purple-700 dark:text-purple-300 transition-all rounded-xl" onClick={() => {
                                onStocksListChange([...customStocksList, { id: Date.now().toString(), ticker: '', shares: 1 }]);
                            }}>
                                <Plus className="w-3 h-3 mr-1" /> Aggiungi Azione/ETF Live
                            </Button>
                            {customStocksList.length > 0 && (
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Totale Azionario</div>
                                    <div className="font-extrabold text-lg text-purple-600 dark:text-purple-400">
                                        {formatEuro(customStocksList.reduce((acc, s) => acc + ((s.currentPrice || 0) * s.shares), 0))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dividend Summary */}
                    {(() => {
                        const stocksWithDividends = customStocksList.filter(s => s.annualDividend && s.annualDividend > 0 && s.shares > 0);
                        if (stocksWithDividends.length === 0) return null;
                        const totalAnnualDividends = stocksWithDividends.reduce((acc, s) => acc + (s.annualDividend || 0) * s.shares, 0);
                        const totalPortfolioValue = customStocksList.reduce((acc, s) => acc + ((s.currentPrice || 0) * s.shares), 0);
                        const weightedYield = totalPortfolioValue > 0 ? (totalAnnualDividends / totalPortfolioValue) * 100 : 0;
                        return (
                            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900 space-y-3 pt-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                    <Banknote className="w-4 h-4" /> Reddito da Dividendi
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center">
                                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Annuo Stimato</div>
                                        <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{formatEuro(totalAnnualDividends)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Mensile</div>
                                        <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{formatEuro(totalAnnualDividends / 12)}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Yield Medio</div>
                                        <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">{weightedYield.toFixed(2)}%</div>
                                    </div>
                                </div>
                                {stocksWithDividends.length > 1 && (
                                    <div className="space-y-1 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                                        {stocksWithDividends.map(s => (
                                            <div key={s.id} className="flex justify-between text-[10px] text-emerald-600 dark:text-emerald-400">
                                                <span className="font-bold">{s.ticker}</span>
                                                <span>{formatEuro((s.annualDividend || 0) * s.shares)}/anno ({((s.dividendYield || 0) * 100).toFixed(1)}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <div className="space-y-2 pt-4 border-t border-slate-200">
                        <Label className="text-slate-500 text-xs uppercase font-bold tracking-wider flex items-center">
                            <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400" /> Fondo Emergenza (Cash / Deposito)
                        </Label>
                        <Input type="number" value={emergencyFund} onChange={e => onEmergencyFundChange(Number(e.target.value))} onBlur={onTriggerSave} className="text-lg bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold focus-visible:ring-emerald-500" />
                    </div>
                </CardContent>
            </Card>

            {/* Portfolio History Chart */}
            {customStocksList.filter(s => s.ticker && s.shares > 0).length > 0 && (
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500">
                    <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 flex flex-row items-center justify-between p-6">
                        <div>
                            <CardTitle className="flex items-center text-lg text-slate-900 dark:text-slate-100">
                                <TrendingUp className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" /> Simulazione Portafoglio (Ultimi 5 Anni)
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-1">
                                Rendimento passato dei tuoi ETF attuali, ipotizzando le stesse quote di oggi.
                            </CardDescription>
                        </div>
                        {isFetchingHistory && <Loader2 className="w-5 h-5 animate-spin text-purple-400" />}
                    </CardHeader>
                    <CardContent className="p-6 h-72">
                        {portfolioHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={portfolioHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorValore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} interval="preserveStartEnd" minTickGap={30} />
                                    <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '16px' }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value: any) => [<span key="value" className="font-extrabold text-purple-600 dark:text-purple-400">{formatEuro(Number(value || 0))}</span>, "Valore Virtuale"]}
                                        labelStyle={{ color: '#64748b', fontWeight: 700, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#64748b', paddingBottom: '10px' }} />
                                    <Area type="monotone" dataKey="Valore" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorValore)" className="drop-shadow-[0_4px_12px_rgba(168,85,247,0.3)]" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-400">
                                {!isFetchingHistory && <p className="text-sm">Nessuno storico disponibile o in fase di caricamento.</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </>
    );
});
