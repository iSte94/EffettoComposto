"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarClock, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEuro } from "@/lib/format";
import {
    buildPlannedEventsSummary,
    buildPlannedEventsTimeline,
    simulateLiquidityPath,
} from "@/lib/finance/planned-events";
import { usePlannedEvents } from "@/hooks/usePlannedEvents";

interface PlannedEventsSummaryCardProps {
    user: { username: string } | null;
    startingLiquidity: number;
    baseMonthlyNetFlow: number;
    className?: string;
}

function currentYearMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
}

export function PlannedEventsSummaryCard({
    user,
    startingLiquidity,
    baseMonthlyNetFlow,
    className,
}: PlannedEventsSummaryCardProps) {
    const { events, loading } = usePlannedEvents(user);
    const startMonth = useMemo(() => currentYearMonth(), []);

    const summary = useMemo(() => buildPlannedEventsSummary(events, [12], startMonth), [events, startMonth]);
    const liquidity = useMemo(() => simulateLiquidityPath({
        startingLiquidity,
        baseMonthlyNetFlow,
        timeline: buildPlannedEventsTimeline(events, {
            startMonth,
            months: 12,
        }),
    }), [baseMonthlyNetFlow, events, startMonth, startingLiquidity]);

    if (!user) return null;

    return (
        <Card className={className}>
            <CardHeader className="border-b border-slate-200/80 bg-slate-50/85 p-5 sm:bg-white/70 sm:p-6">
                <CardTitle className="flex items-center text-lg text-slate-900">
                    <CalendarClock className="mr-3 h-5 w-5 text-violet-600" /> Eventi Futuri
                </CardTitle>
                <CardDescription className="text-sm text-slate-500">
                    Sintesi rapida degli impegni e delle entrate pianificate sul cashflow dei prossimi 12 mesi.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5 sm:p-6">
                {loading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-16 rounded-2xl" />
                        <Skeleton className="h-16 rounded-2xl" />
                        <Skeleton className="h-16 rounded-2xl" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-500">
                        Nessun evento futuro pianificato. Aggiungili dal tab Budgeting per stimare l&apos;impatto sul cashflow.
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Impatto netto 12m</p>
                                <p className={`mt-2 text-lg font-extrabold tabular-nums ${(summary.windows[12]?.netImpact ?? 0) > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    {formatEuro(summary.windows[12]?.netImpact ?? 0)}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Rate concorrenti</p>
                                <p className="mt-2 text-lg font-extrabold text-slate-900">{summary.windows[12]?.maxConcurrentFinancedEvents ?? 0}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Min liquidita&apos;</p>
                                <p className={`mt-2 text-lg font-extrabold tabular-nums ${liquidity.minLiquidity < 0 ? "text-rose-600" : "text-slate-900"}`}>
                                    {formatEuro(liquidity.minLiquidity)}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                            <p className="text-sm font-medium text-violet-700">
                                {summary.nextEvent
                                    ? `Prossimo evento: ${summary.nextEvent.title} (${summary.nextEvent.eventMonth}) per ${formatEuro(summary.nextEvent.amount)}.`
                                    : "Nessun evento in arrivo nei prossimi mesi."}
                            </p>
                        </div>

                        {liquidity.firstNegativeMonth && (
                            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                                <p className="flex items-center gap-2 text-sm font-medium text-rose-700">
                                    <AlertTriangle className="h-4 w-4" />
                                    La liquidita&apos; stimata scende sotto zero a partire da {liquidity.firstNegativeMonth}. Valuta copertura cash o timing diverso.
                                </p>
                            </div>
                        )}

                        {!liquidity.firstNegativeMonth && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                                    <Sparkles className="h-4 w-4" />
                                    Gli eventi pianificati restano compatibili con il cashflow stimato dei prossimi 12 mesi.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
