"use client";

import { memo, useMemo, useState, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, Pencil, Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { formatEuro } from "@/lib/format";
import type { AssetRecord, RealEstateProperty, CustomStock } from "@/types";

interface SnapshotHistoryTableProps {
    history: AssetRecord[];
    onEdit: (item: AssetRecord) => void;
    onDelete: (id: string) => void;
}

interface Variation {
    diff: number;
    pct: number;
    pastDate: string;
}

const parseList = <T,>(json?: string): T[] => {
    if (!json) return [];
    try {
        const parsed = JSON.parse(json);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
};

const findPastSnapshot = (
    current: AssetRecord,
    sortedDesc: AssetRecord[],
    daysAgo: number
): AssetRecord | null => {
    const target = subDays(parseISO(current.date), daysAgo).getTime();
    let best: AssetRecord | null = null;
    for (const h of sortedDesc) {
        if (h.id === current.id) continue;
        const t = parseISO(h.date).getTime();
        if (t <= target) {
            if (!best || t > parseISO(best.date).getTime()) best = h;
        }
    }
    return best;
};

const computeVariation = (
    current: AssetRecord,
    past: AssetRecord | null,
    getter: (r: AssetRecord) => number
): Variation | null => {
    if (!past) return null;
    const cur = getter(current);
    const prev = getter(past);
    const diff = cur - prev;
    const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 0;
    return { diff, pct, pastDate: past.date };
};

const singleStockValue = (s: CustomStock): number => {
    if (typeof s.manualValue === "number" && s.manualValue > 0) return s.manualValue;
    return (s.shares || 0) * (s.currentPrice || 0);
};

const stockValueInRecord = (record: AssetRecord, refId: string, refTicker: string): number => {
    const list = parseList<CustomStock>(record.customStocksList);
    if (list.length === 0) return 0;
    const byId = list.find(s => s.id === refId);
    if (byId) return singleStockValue(byId);
    const byTicker = list.find(s => s.ticker === refTicker);
    return byTicker ? singleStockValue(byTicker) : 0;
};

function VariationBadge({ variation, compact = false }: { variation: Variation | null; compact?: boolean }) {
    if (!variation) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Minus className="h-3 w-3" /> n/d
            </span>
        );
    }
    const { diff, pct } = variation;
    const isUp = diff > 0;
    const isDown = diff < 0;
    const color = isUp
        ? "text-emerald-600 bg-emerald-50 border-emerald-200"
        : isDown
            ? "text-rose-600 bg-rose-50 border-rose-200"
            : "text-slate-500 bg-slate-50 border-slate-200";
    const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
    const sign = diff > 0 ? "+" : diff < 0 ? "-" : "";
    const pctLabel = `${sign}${Math.abs(pct).toFixed(2)}%`;
    const euroLabel = `${sign}${formatEuro(Math.abs(diff))}`;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${color}`}>
            <Icon className="h-3 w-3" />
            {compact ? (
                <span className="whitespace-nowrap">{euroLabel} <span className="opacity-70">({pctLabel})</span></span>
            ) : (
                <>
                    {euroLabel}
                    <span className="opacity-80">({pctLabel})</span>
                </>
            )}
        </span>
    );
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: "positive" | "negative" | "muted" }) {
    const color =
        accent === "positive"
            ? "text-emerald-600"
            : accent === "negative"
                ? "text-rose-600"
                : accent === "muted"
                    ? "text-slate-500"
                    : "text-slate-800";
    return (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
            <span className={`text-sm font-semibold ${color}`}>{value}</span>
        </div>
    );
}

function StockDetailRow({
    stock,
    current,
    sortedDesc,
}: {
    stock: CustomStock;
    current: AssetRecord;
    sortedDesc: AssetRecord[];
}) {
    const getter = (r: AssetRecord) => stockValueInRecord(r, stock.id, stock.ticker);
    const v1 = computeVariation(current, findPastSnapshot(current, sortedDesc, 1), getter);
    const v7 = computeVariation(current, findPastSnapshot(current, sortedDesc, 7), getter);
    const v30 = computeVariation(current, findPastSnapshot(current, sortedDesc, 30), getter);
    const value = singleStockValue(stock);

    return (
        <div className="border-b border-slate-100 py-2 last:border-b-0 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {stock.ticker}
                    {stock.shares ? <span className="text-slate-400"> · {stock.shares}</span> : null}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatEuro(value)}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase text-slate-400">1g</span>
                <VariationBadge variation={v1} compact />
                <span className="ml-1 text-[10px] uppercase text-slate-400">7g</span>
                <VariationBadge variation={v7} compact />
                <span className="ml-1 text-[10px] uppercase text-slate-400">30g</span>
                <VariationBadge variation={v30} compact />
            </div>
        </div>
    );
}

function MetricWithVariations({
    label,
    value,
    current,
    sortedDesc,
    getter,
    emphasize = false,
    negative = false,
}: {
    label: string;
    value: string;
    current: AssetRecord;
    sortedDesc: AssetRecord[];
    getter: (r: AssetRecord) => number;
    emphasize?: boolean;
    negative?: boolean;
}) {
    const v1 = computeVariation(current, findPastSnapshot(current, sortedDesc, 1), getter);
    const v7 = computeVariation(current, findPastSnapshot(current, sortedDesc, 7), getter);
    const v30 = computeVariation(current, findPastSnapshot(current, sortedDesc, 30), getter);
    const valueColor = emphasize
        ? "text-emerald-700 dark:text-emerald-400 text-base"
        : negative
            ? "text-rose-600 dark:text-rose-400"
            : "text-slate-900 dark:text-slate-100";

    return (
        <div className="rounded-lg border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
                <div className={`text-sm font-bold ${valueColor}`}>{value}</div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase text-slate-400">1g</span>
                <VariationBadge variation={v1} compact />
                <span className="ml-1 text-[10px] uppercase text-slate-400">7g</span>
                <VariationBadge variation={v7} compact />
                <span className="ml-1 text-[10px] uppercase text-slate-400">30g</span>
                <VariationBadge variation={v30} compact />
            </div>
        </div>
    );
}

function SnapshotDetailPanel({ item, sortedDesc }: { item: AssetRecord; sortedDesc: AssetRecord[] }) {
    const realEstateList = parseList<RealEstateProperty>(item.realEstateList);
    const stocksList = parseList<CustomStock>(item.customStocksList);
    const bitcoinValue = (item.bitcoinAmount || 0) * (item.bitcoinPrice || 0);

    return (
        <div className="space-y-4 bg-slate-50/80 p-4 sm:p-6 dark:bg-slate-900/40">
            {/* Totale in testa con variazioni */}
            <MetricWithVariations
                label="Patrimonio Netto Totale"
                value={formatEuro(item.totalNetWorth || 0)}
                current={item}
                sortedDesc={sortedDesc}
                getter={r => r.totalNetWorth || 0}
                emphasize
            />

            {/* Griglia componenti con variazioni */}
            <div className="grid gap-3 sm:grid-cols-2">
                <MetricWithVariations
                    label="Immobili"
                    value={formatEuro(item.realEstateValue)}
                    current={item}
                    sortedDesc={sortedDesc}
                    getter={r => r.realEstateValue || 0}
                />
                <MetricWithVariations
                    label="Liquidità"
                    value={formatEuro(item.liquidStockValue || 0)}
                    current={item}
                    sortedDesc={sortedDesc}
                    getter={r => r.liquidStockValue || 0}
                />
                <MetricWithVariations
                    label="ETF / Strumenti"
                    value={formatEuro(item.stocksSnapshotValue || 0)}
                    current={item}
                    sortedDesc={sortedDesc}
                    getter={r => r.stocksSnapshotValue || 0}
                />
                <MetricWithVariations
                    label={`Bitcoin (${item.bitcoinAmount || 0} BTC @ ${formatEuro(item.bitcoinPrice || 0)})`}
                    value={formatEuro(bitcoinValue)}
                    current={item}
                    sortedDesc={sortedDesc}
                    getter={r => (r.bitcoinAmount || 0) * (r.bitcoinPrice || 0)}
                />
                <MetricWithVariations
                    label="Fondo Emergenza"
                    value={formatEuro(item.emergencyFund || 0)}
                    current={item}
                    sortedDesc={sortedDesc}
                    getter={r => r.emergencyFund || 0}
                />
                <MetricWithVariations
                    label="Fondo Pensione"
                    value={formatEuro(item.pensionFund || 0)}
                    current={item}
                    sortedDesc={sortedDesc}
                    getter={r => r.pensionFund || 0}
                />
                <MetricWithVariations
                    label="Beni Rifugio"
                    value={formatEuro(item.safeHavens || 0)}
                    current={item}
                    sortedDesc={sortedDesc}
                    getter={r => r.safeHavens || 0}
                />
                <MetricWithVariations
                    label="Debiti Totali"
                    value={formatEuro(item.debtsTotal || 0)}
                    current={item}
                    sortedDesc={sortedDesc}
                    getter={r => r.debtsTotal || 0}
                    negative
                />
            </div>

            {/* Breakdown per-elemento (immobili ed ETF) */}
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Dettaglio Immobili</div>
                    {realEstateList.length > 0 ? (
                        <div className="space-y-1">
                            {realEstateList.map(p => (
                                <DetailRow key={p.id} label={p.name || "Immobile"} value={formatEuro(p.value || 0)} />
                            ))}
                            <DetailRow label="Costi annui" value={formatEuro(item.realEstateCosts || 0)} accent="muted" />
                            <DetailRow label="Rendita annua" value={formatEuro(item.realEstateRent || 0)} accent="muted" />
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400">Nessun immobile registrato</div>
                    )}
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Dettaglio ETF / Strumenti</div>
                    {stocksList.length > 0 ? (
                        <div>
                            {stocksList.map(s => (
                                <StockDetailRow key={s.id} stock={s} current={item} sortedDesc={sortedDesc} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-400">Nessun titolo registrato</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export const SnapshotHistoryTable = memo(function SnapshotHistoryTable({ history, onEdit, onDelete }: SnapshotHistoryTableProps) {
    const sortedHistory = useMemo(
        () => [...history].sort((a, b) => b.date.localeCompare(a.date)),
        [history]
    );
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (sortedHistory.length === 0) return null;

    const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

    return (
        <Card className="mt-8 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_55px_-35px_rgba(15,23,42,0.42)] sm:bg-white/90 sm:backdrop-blur-xl">
            <CardHeader className="border-b border-slate-200/80 bg-slate-50/85 px-4 py-4 sm:bg-white/70 sm:px-6">
                <CardTitle className="text-base font-bold text-slate-900 sm:text-lg">
                    Dettaglio Snapshot
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-0">
                {/* Mobile */}
                <div className="space-y-3 sm:hidden">
                    {sortedHistory.map((item) => {
                        const isOpen = expandedId === item.id;
                        return (
                            <div key={item.id} className="rounded-2xl border border-slate-200/85 bg-slate-50/85 shadow-sm">
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => toggle(item.id)}
                                            className="flex flex-1 items-center gap-2 text-left"
                                            aria-expanded={isOpen}
                                        >
                                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Data</div>
                                                <div className="mt-1 text-sm font-semibold text-slate-900">{format(parseISO(item.date), "dd/MM/yyyy")}</div>
                                            </div>
                                        </button>
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
                                            <div className="mt-1 font-semibold text-slate-800">{formatEuro(item.liquidStockValue || 0)}</div>
                                        </div>
                                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ETF / Strumenti</div>
                                            <div className="mt-1 font-semibold text-slate-800">{formatEuro(item.stocksSnapshotValue || 0)}</div>
                                        </div>
                                        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bitcoin</div>
                                            <div className="mt-1 font-semibold text-slate-800">{item.bitcoinAmount} BTC</div>
                                            <div className="mt-1 text-xs text-slate-500">@{formatEuro(item.bitcoinPrice)}</div>
                                        </div>
                                        <div className="col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 shadow-sm">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Totale</div>
                                            <div className="mt-1 font-bold text-emerald-600">{formatEuro(item.totalNetWorth || 0)}</div>
                                        </div>
                                    </div>
                                </div>
                                {isOpen && <SnapshotDetailPanel item={item} sortedDesc={sortedHistory} />}
                            </div>
                        );
                    })}
                </div>

                {/* Desktop */}
                <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="border-b border-slate-200/80 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/70">
                            <tr>
                                <th className="w-10 px-2 py-4 sm:px-3" aria-label="Espandi" />
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Data</th>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Immobili</th>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Liquidita</th>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">ETF / Strumenti</th>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Bitcoin</th>
                                <th className="px-4 py-4 font-bold tracking-wider text-slate-700 dark:text-slate-300 sm:px-6">Totale</th>
                                <th className="px-4 py-4 font-bold tracking-wider sm:px-6">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
                            {sortedHistory.map(item => {
                                const isOpen = expandedId === item.id;
                                return (
                                    <Fragment key={item.id}>
                                        <tr className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                                            <td className="px-2 py-4 sm:px-3">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggle(item.id)}
                                                    className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
                                                    aria-label={isOpen ? "Chiudi dettagli" : "Apri dettagli"}
                                                    aria-expanded={isOpen}
                                                >
                                                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                                                </Button>
                                            </td>
                                            <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-100 sm:px-6">
                                                {format(parseISO(item.date), "dd/MM/yyyy")}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 dark:text-slate-400 sm:px-6">{formatEuro(item.realEstateValue)}</td>
                                            <td className="px-4 py-4 text-slate-600 dark:text-slate-400 sm:px-6">{formatEuro(item.liquidStockValue || 0)}</td>
                                            <td className="px-4 py-4 text-slate-600 dark:text-slate-400 sm:px-6">{formatEuro(item.stocksSnapshotValue || 0)}</td>
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
                                        {isOpen && (
                                            <tr className="bg-slate-50/60 dark:bg-slate-900/40">
                                                <td colSpan={8} className="p-0">
                                                    <SnapshotDetailPanel item={item} sortedDesc={sortedHistory} />
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
});
