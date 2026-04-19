"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Car, Euro, Percent, Calendar, CreditCard, ChevronDown, ChevronUp, Users, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { usePreferences } from "@/hooks/usePreferences";
import { ExistingLoan, getInstallmentAmountForMonth } from "@/lib/finance/loans";
import { DTI_THRESHOLD } from "@/lib/constants";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Legend, CartesianGrid,
} from "recharts";

interface AmortizationRow {
    mese: number;
    rata: number;
    capitale: number;
    interessi: number;
    debito: number;
}

interface AmortizationResult {
    installment: number;
    totalPaid: number;
    totalInterest: number;
    schedule: AmortizationRow[];
    chartData: { label: string; Capitale: number; Interessi: number; "Debito Residuo": number }[];
}

const DTI_SCALE_MAX = 50;
const DTI_WARNING_THRESHOLD = 40;

function getDtiPosition(value: number) {
    return `${(value / DTI_SCALE_MAX) * 100}%`;
}

const DTI_MARKERS = [
    { value: 0, label: "0%", labelClassName: "text-muted-foreground", style: { left: "0%", transform: "translateX(0)" } },
    { value: 33, label: "33%", labelClassName: "font-medium text-emerald-600", style: { left: getDtiPosition(33), transform: "translateX(-50%)" } },
    { value: DTI_WARNING_THRESHOLD, label: "40%", labelClassName: "font-medium text-amber-500", style: { left: getDtiPosition(DTI_WARNING_THRESHOLD), transform: "translateX(-50%)" } },
    { value: 50, label: "50%", labelClassName: "text-muted-foreground", style: { left: "100%", transform: "translateX(-100%)" } },
] as const;

const DTI_TRACK_SEGMENTS = [
    {
        start: 0,
        end: 33,
        className: "bg-emerald-100/90 dark:bg-emerald-950/40",
    },
    {
        start: 33,
        end: DTI_WARNING_THRESHOLD,
        className: "bg-amber-100/90 dark:bg-amber-950/35",
    },
    {
        start: DTI_WARNING_THRESHOLD,
        end: DTI_SCALE_MAX,
        className: "bg-red-100/90 dark:bg-red-950/35",
    },
] as const;

function computeAmortization(principal: number, annualRatePct: number, months: number): AmortizationResult {
    const empty: AmortizationResult = { installment: 0, totalPaid: 0, totalInterest: 0, schedule: [], chartData: [] };
    if (principal <= 0 || months <= 0) return empty;

    const i = annualRatePct / 100 / 12;
    const installment =
        i === 0
            ? principal / months
            : (principal * i * Math.pow(1 + i, months)) / (Math.pow(1 + i, months) - 1);

    const schedule: AmortizationRow[] = [];
    let balance = principal;

    for (let k = 1; k <= months; k++) {
        const interest = balance * i;
        const capital = installment - interest;
        balance = Math.max(0, balance - capital);
        schedule.push({ mese: k, rata: installment, capitale: capital, interessi: interest, debito: balance });
    }

    // Aggregate per year for chart (12 mesi per anno)
    const yearCount = Math.ceil(months / 12);
    const chartData = Array.from({ length: yearCount }, (_, yi) => {
        const rows = schedule.slice(yi * 12, (yi + 1) * 12);
        const capSum = rows.reduce((s, r) => s + r.capitale, 0);
        const intSum = rows.reduce((s, r) => s + r.interessi, 0);
        const lastRow = rows[rows.length - 1];
        return {
            label: yearCount <= 10 ? `Anno ${yi + 1}` : `A${yi + 1}`,
            Capitale: Math.round(capSum),
            Interessi: Math.round(intSum),
            "Debito Residuo": Math.round(lastRow?.debito ?? 0),
        };
    });

    return {
        installment,
        totalPaid: installment * months,
        totalInterest: installment * months - principal,
        schedule,
        chartData,
    };
}

export function LoanCalculator() {
    const [importo, setImporto] = useState(50000);
    const [anticipo, setAnticipo] = useState(0);
    const [tasso, setTasso] = useState(2.5);
    const [durata, setDurata] = useState(60);
    const [showTable, setShowTable] = useState(false);
    const [intestatario, setIntestatario] = useState<"person1" | "person2" | "both">("person1");

    const { preferences } = usePreferences();

    const principal = Math.max(0, importo - anticipo);

    const result = useMemo(
        () => computeAmortization(principal, tasso, durata),
        [principal, tasso, durata],
    );

    const costoPct = principal > 0 ? (result.totalInterest / principal) * 100 : 0;

    const person1Name = preferences.person1Name || "Persona 1";
    const person2Name = preferences.person2Name || "Persona 2";

    const existingLoans: ExistingLoan[] = useMemo(() => {
        try { return JSON.parse(preferences.existingLoansList); } catch { return []; }
    }, [preferences.existingLoansList]);

    const dtiData = useMemo(() => {
        const relevantLoans = intestatario === "both"
            ? existingLoans
            : existingLoans.filter((l) =>
                intestatario === "person1" ? l.owner !== "person2" : l.owner !== "person1",
            );

        const now = new Date();
        let activeCount = 0;
        const existingInstallment = relevantLoans.reduce((acc, loan) => {
            if (!loan.startDate || !loan.endDate) {
                activeCount++;
                return acc + (Number(loan.installment) || 0);
            }
            const start = new Date(loan.startDate + "-01");
            const end = new Date(loan.endDate + "-01");
            const totalMonths =
                (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            const monthsPassed =
                (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
            if (monthsPassed >= totalMonths) return acc;
            activeCount++;
            return acc + getInstallmentAmountForMonth(loan, monthsPassed, totalMonths, monthsPassed);
        }, 0);

        const income =
            intestatario === "person1" ? (preferences.person1Income || 0)
            : intestatario === "person2" ? (preferences.person2Income || 0)
            : (preferences.person1Income || 0) + (preferences.person2Income || 0);

        const totalInstallment = existingInstallment + result.installment;
        const dti = income > 0 ? totalInstallment / income : 0;
        const maxNewInstallment = Math.max(0, income * DTI_THRESHOLD - existingInstallment);

        return {
            activeCount,
            existingInstallment,
            income,
            totalInstallment,
            dti,
            dtiPct: dti * 100,
            isOk: dti > 0 && dti <= DTI_THRESHOLD,
            isWarning: dti > DTI_THRESHOLD && dti <= DTI_WARNING_THRESHOLD / 100,
            isDanger: dti > DTI_WARNING_THRESHOLD / 100,
            hasIncome: income > 0,
            maxNewInstallment,
        };
    }, [existingLoans, intestatario, preferences.person1Income, preferences.person2Income, result.installment]);

    const dtiProgressPct = Math.min(100, (dtiData.dtiPct / DTI_SCALE_MAX) * 100);
    const dtiIndicatorValue = Math.min(DTI_SCALE_MAX, Math.max(0, dtiData.dtiPct));
    const dtiIndicatorTransform =
        dtiIndicatorValue <= 4
            ? "translateX(0)"
            : dtiIndicatorValue >= DTI_SCALE_MAX - 4
            ? "translateX(-100%)"
            : "translateX(-50%)";
    const dtiAccentClasses = dtiData.isOk
        ? {
            badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/60 dark:text-emerald-300",
            fill: "bg-emerald-500",
            marker: "bg-emerald-500 ring-emerald-500/25",
        }
        : dtiData.isWarning
        ? {
            badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/60 dark:text-amber-300",
            fill: "bg-amber-500",
            marker: "bg-amber-500 ring-amber-500/25",
        }
        : {
            badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/80 dark:bg-red-950/60 dark:text-red-300",
            fill: "bg-red-500",
            marker: "bg-red-500 ring-red-500/25",
        };

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-orange-50 p-2.5 dark:bg-orange-950/50">
                    <Car className="h-6 w-6 text-orange-500 dark:text-orange-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Calcolatore Rata Finanziamento</h2>
                    <p className="text-xs text-muted-foreground">Ammortamento alla francese — auto, moto, arredamento e altri prestiti personali</p>
                </div>
            </div>

            {/* Inputs */}
            <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <CardContent className="p-5 space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Euro className="h-3 w-3" /> Importo Finanziato
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                step="500"
                                value={importo || ""}
                                onChange={(e) => setImporto(Math.max(0, Number(e.target.value) || 0))}
                                className="min-h-11 rounded-xl text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Euro className="h-3 w-3" /> Anticipo / Acconto
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                step="500"
                                value={anticipo || ""}
                                onChange={(e) => setAnticipo(Math.max(0, Number(e.target.value) || 0))}
                                className="min-h-11 rounded-xl text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" /> Intestatario
                        </Label>
                        <div className="flex gap-2">
                            {([
                                { value: "person1", label: person1Name },
                                { value: "person2", label: person2Name },
                                { value: "both", label: "Entrambi" },
                            ] as const).map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setIntestatario(opt.value)}
                                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                                        intestatario === opt.value
                                            ? "bg-orange-500 text-white shadow-sm"
                                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Percent className="h-3 w-3" /> Tasso Annuo (TAN)
                                </Label>
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{tasso.toFixed(2)}%</span>
                            </div>
                            <Slider
                                min={0}
                                max={25}
                                step={0.01}
                                value={[tasso]}
                                onValueChange={([v]) => setTasso(v)}
                                className="[&_[role=slider]]:bg-orange-500"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0%</span><span>25%</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" /> Durata
                                </Label>
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                    {durata} mesi{durata >= 12 ? ` (${(durata / 12).toFixed(1)}a)` : ""}
                                </span>
                            </div>
                            <Slider
                                min={6}
                                max={120}
                                step={6}
                                value={[durata]}
                                onValueChange={([v]) => setDurata(v)}
                                className="[&_[role=slider]]:bg-orange-500"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>6 mesi</span><span>10 anni</span>
                            </div>
                        </div>
                    </div>

                    {anticipo > 0 && (
                        <p className="text-xs text-muted-foreground rounded-xl bg-muted/40 px-3 py-2">
                            Capitale finanziato: <span className="font-semibold text-foreground">{formatEuro(principal)}</span>
                            {" "}(importo {formatEuro(importo)} − anticipo {formatEuro(anticipo)})
                        </p>
                    )}

                    {/* Live summary */}
                    {principal > 0 && (
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200/80 bg-orange-50/70 px-4 py-3 dark:border-orange-900/60 dark:bg-orange-950/25">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Rata mensile</p>
                                <p className="text-2xl font-extrabold tabular-nums text-orange-600 dark:text-orange-400">
                                    {formatEuro(result.installment)}
                                </p>
                                <p className="text-[10px] text-orange-400">per {durata} mesi</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Interessi totali</p>
                                <p className="text-2xl font-extrabold tabular-nums text-red-600 dark:text-red-400">
                                    {formatEuro(result.totalInterest)}
                                </p>
                                <p className="text-[10px] text-red-400">costo del credito ({costoPct.toFixed(1)}%)</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* DTI Analysis */}
            {dtiData.hasIncome && result.installment > 0 && (
                <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-bold text-foreground">Analisi Rata / Reddito</h3>
                            <span className="ml-auto rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {intestatario === "both" ? `${person1Name} + ${person2Name}` : intestatario === "person1" ? person1Name : person2Name}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Reddito netto mensile</span>
                                <span className="font-semibold">{formatEuro(dtiData.income)}</span>
                            </div>
                            {dtiData.existingInstallment > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Rate esistenti ({dtiData.activeCount} prestit{dtiData.activeCount === 1 ? "o" : "i"} attiv{dtiData.activeCount === 1 ? "o" : "i"})</span>
                                    <span>{formatEuro(dtiData.existingInstallment)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">+ Nuova rata finanziamento</span>
                                <span className="font-semibold text-orange-600 dark:text-orange-400">{formatEuro(result.installment)}</span>
                            </div>
                            <div className="flex justify-between border-t border-border/60 pt-2 font-bold">
                                <span>Totale rate mensili</span>
                                <span>{formatEuro(dtiData.totalInstallment)}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Rapporto rata / reddito</span>
                                <span className={`font-bold ${dtiData.isOk ? "text-emerald-600" : dtiData.isWarning ? "text-amber-600" : "text-red-600"}`}>
                                    {dtiData.dtiPct.toFixed(1)}% su max 33%
                                </span>
                            </div>
                            <div className="relative pt-7">
                                <div
                                    className="absolute top-0 z-30"
                                    style={{ left: getDtiPosition(dtiIndicatorValue), transform: dtiIndicatorTransform }}
                                >
                                    <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold shadow-sm ${dtiAccentClasses.badge}`}>
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        {dtiData.dtiPct.toFixed(1)}%
                                    </div>
                                </div>
                                <div className="relative h-4 overflow-hidden rounded-full bg-muted/60 shadow-inner ring-1 ring-black/5 dark:ring-white/10">
                                    {DTI_TRACK_SEGMENTS.map((segment) => (
                                        <div
                                            key={`${segment.start}-${segment.end}`}
                                            className={`absolute inset-y-0 ${segment.className}`}
                                            style={{
                                                left: getDtiPosition(segment.start),
                                                width: `${((segment.end - segment.start) / DTI_SCALE_MAX) * 100}%`,
                                            }}
                                        />
                                    ))}
                                    {DTI_MARKERS.filter((marker) => marker.value > 0 && marker.value < DTI_SCALE_MAX).map((marker) => (
                                        <div
                                            key={marker.value}
                                            className={`absolute inset-y-0 z-20 w-px ${marker.value === 33 ? "bg-emerald-500/80" : "bg-amber-500/80"}`}
                                            style={{ left: getDtiPosition(marker.value) }}
                                        />
                                    ))}
                                    <div
                                        className={`relative z-10 h-full rounded-full transition-all duration-300 ${dtiAccentClasses.fill}`}
                                        style={{ width: `${dtiProgressPct}%` }}
                                    />
                                    <div
                                        className={`absolute top-1/2 z-30 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-background shadow-sm ring-4 ${dtiAccentClasses.marker}`}
                                        style={{ left: getDtiPosition(dtiIndicatorValue), transform: "translate(-50%, -50%)" }}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Area comfort</span>
                                <span>Attenzione</span>
                                <span>Critica</span>
                            </div>
                            <div className="relative h-4 text-[10px]">
                                <div
                                    className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/70"
                                />
                                {DTI_MARKERS.map((marker) => (
                                    <span
                                        key={marker.value}
                                        className={`absolute top-0 z-10 rounded-full bg-card px-1 ${marker.labelClassName}`}
                                        style={marker.style}
                                    >
                                        {marker.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className={`flex items-start gap-2.5 rounded-2xl p-3.5 text-xs ${
                            dtiData.isOk
                                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                : dtiData.isWarning
                                ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                                : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                        }`}>
                            {dtiData.isOk
                                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                                : dtiData.isDanger
                                ? <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                                : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />}
                            <span>
                                {dtiData.isOk
                                    ? `Rapporto rata/reddito al ${dtiData.dtiPct.toFixed(1)}%, entro il limite del 33%. La banca dovrebbe approvare il finanziamento.`
                                    : dtiData.isWarning
                                    ? `Rapporto rata/reddito al ${dtiData.dtiPct.toFixed(1)}%, oltre il 33% consigliato. L'approvazione dipende dalla politica del singolo istituto.`
                                    : `Rapporto rata/reddito al ${dtiData.dtiPct.toFixed(1)}%, oltre il 40%. La banca difficilmente approverà il finanziamento nelle condizioni attuali.`}
                            </span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Rata massima aggiuntiva sostenibile al 33%:{" "}
                            <span className={`font-semibold ${dtiData.maxNewInstallment > 0 ? "text-foreground" : "text-red-500"}`}>
                                {dtiData.maxNewInstallment > 0 ? formatEuro(dtiData.maxNewInstallment) : "soglia già superata dalle rate esistenti"}
                            </span>
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Rata Mensile</p>
                    <p className="mt-1 text-lg font-extrabold text-orange-600 dark:text-orange-400">{formatEuro(result.installment)}</p>
                    <p className="mt-0.5 text-[10px] text-orange-400">per {durata} mesi</p>
                </div>
                <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Totale Pagato</p>
                    <p className="mt-1 text-lg font-extrabold text-blue-600 dark:text-blue-400">{formatEuro(result.totalPaid)}</p>
                    <p className="mt-0.5 text-[10px] text-blue-400">capitale + interessi</p>
                </div>
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Interessi Totali</p>
                    <p className="mt-1 text-lg font-extrabold text-red-600 dark:text-red-400">{formatEuro(result.totalInterest)}</p>
                    <p className="mt-0.5 text-[10px] text-red-400">costo del credito</p>
                </div>
                <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">% Costo Credito</p>
                    <p className="mt-1 text-lg font-extrabold text-rose-600 dark:text-rose-400">{costoPct.toFixed(1)}%</p>
                    <p className="mt-0.5 text-[10px] text-rose-400">su capitale finanziato</p>
                </div>
            </div>

            {/* Chart */}
            {result.chartData.length > 0 && (
                <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                    <CardContent className="p-5">
                        <h3 className="mb-4 text-sm font-bold text-muted-foreground">Piano di Rimborso per Anno</h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={result.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                                    <YAxis
                                        yAxisId="bars"
                                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                        tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                                    />
                                    <YAxis
                                        yAxisId="line"
                                        orientation="right"
                                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                        tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                                    />
                                    <Tooltip
                                        formatter={(value: number | string | undefined, name?: string) => [formatEuro(Number(value ?? 0)), name ?? "Valore"]}
                                        contentStyle={{
                                            borderRadius: "16px",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "var(--popover)",
                                            color: "var(--popover-foreground)",
                                            boxShadow: "0 16px 40px -16px rgba(15,23,42,0.45)",
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                                    <Bar yAxisId="bars" dataKey="Capitale" stackId="a" fill="#3b82f6" fillOpacity={0.85} radius={[0, 0, 4, 4]} />
                                    <Bar yAxisId="bars" dataKey="Interessi" stackId="a" fill="#ef4444" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
                                    <Line
                                        yAxisId="line"
                                        type="monotone"
                                        dataKey="Debito Residuo"
                                        stroke="#f97316"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="mt-3 text-[10px] text-muted-foreground text-center">
                            <span className="inline-block w-3 h-2 bg-blue-500 rounded mr-1" />Quota capitale &nbsp;
                            <span className="inline-block w-3 h-2 bg-red-500 rounded mr-1" />Quota interessi &nbsp;
                            <span className="font-semibold text-orange-500">— Debito residuo</span> (asse dx)
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Amortization table toggle */}
            {result.schedule.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowTable((v) => !v)}
                        className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card/80 px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/40"
                    >
                        <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-orange-500" />
                            Piano di ammortamento dettagliato ({durata} rate)
                        </span>
                        {showTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showTable && (
                        <Card className="mt-2 rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                            <CardContent className="p-0">
                                <div className="max-h-96 overflow-auto rounded-3xl">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                                            <tr>
                                                {["Mese", "Rata", "Q. Capitale", "Q. Interessi", "Debito Residuo"].map((h) => (
                                                    <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.schedule.map((row, idx) => (
                                                <tr
                                                    key={row.mese}
                                                    className={idx % 2 === 0 ? "bg-transparent" : "bg-muted/20"}
                                                >
                                                    <td className="px-4 py-2 font-medium">{row.mese}</td>
                                                    <td className="px-4 py-2">{formatEuro(row.rata)}</td>
                                                    <td className="px-4 py-2 text-blue-600 dark:text-blue-400">{formatEuro(row.capitale)}</td>
                                                    <td className="px-4 py-2 text-red-500 dark:text-red-400">{formatEuro(row.interessi)}</td>
                                                    <td className="px-4 py-2 font-semibold">{formatEuro(row.debito)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Info box */}
            <div className="space-y-2 rounded-3xl border border-orange-200 bg-orange-50/90 p-5 text-sm dark:border-orange-800 dark:bg-orange-950/20">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">Come funziona</p>
                <ul className="list-inside list-disc space-y-1 text-xs text-orange-700 dark:text-orange-400">
                    <li>La rata è costante per tutta la durata del prestito (ammortamento alla francese)</li>
                    <li>Nelle prime rate la quota interessi è maggiore; con il tempo cresce la quota capitale</li>
                    <li>Il TAN (Tasso Annuo Nominale) non include le spese accessorie — il TAEG effettivo può essere più alto</li>
                    <li>Aumentare l&apos;anticipo riduce il capitale finanziato e quindi gli interessi totali</li>
                </ul>
            </div>
        </div>
    );
}
