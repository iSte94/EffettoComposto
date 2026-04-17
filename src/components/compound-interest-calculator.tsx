"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp, Banknote, PiggyBank, Sparkles, TrendingDown } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatEuro } from "@/lib/format";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend,
} from "recharts";

export function CompoundInterestCalculator() {
    const [initialCapital, setInitialCapital] = useState(10000);
    const [monthlyContribution, setMonthlyContribution] = useState(300);
    const [annualRate, setAnnualRate] = useState(7);
    const [years, setYears] = useState(20);
    const [inflationRate, setInflationRate] = useState(2.5);

    const result = useMemo(() => {
        const monthlyRate = annualRate / 100 / 12;
        const chartData: { anno: number; label: string; Versato: number; Interessi: number; Totale: number }[] = [];

        let balance = initialCapital;
        let totalDeposited = initialCapital;
        // Prima annualita' in cui gli interessi maturati superano il capitale versato (effetto compounding).
        let crossoverYear: number | null = null;

        chartData.push({
            anno: 0,
            label: "Oggi",
            Versato: initialCapital,
            Interessi: 0,
            Totale: initialCapital,
        });

        for (let year = 1; year <= years; year++) {
            for (let month = 1; month <= 12; month++) {
                balance = balance * (1 + monthlyRate) + monthlyContribution;
                totalDeposited += monthlyContribution;
            }
            const interestAccrued = balance - totalDeposited;
            if (crossoverYear === null && interestAccrued > totalDeposited) {
                crossoverYear = year;
            }
            chartData.push({
                anno: year,
                label: `Anno ${year}`,
                Versato: Math.round(totalDeposited),
                Interessi: Math.round(interestAccrued),
                Totale: Math.round(balance),
            });
        }

        // Valore reale a potere d'acquisto odierno: deflaziona il nominale finale.
        const inflationFactor = Math.pow(1 + inflationRate / 100, years);
        const realFinalBalance = inflationFactor > 0 ? balance / inflationFactor : balance;

        return {
            finalBalance: balance,
            totalDeposited,
            totalInterest: balance - totalDeposited,
            chartData,
            crossoverYear,
            realFinalBalance,
        };
    }, [initialCapital, monthlyContribution, annualRate, years, inflationRate]);

    return (
        <div className="animate-in fade-in-50 space-y-8 duration-500">
            <div className="space-y-4 pb-6 pt-4 text-center">
                <div className="mb-2 inline-flex items-center justify-center rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-md">
                    <Calculator className="h-8 w-8 text-teal-600 dark:text-teal-400" />
                </div>
                <h1 className="flex flex-wrap items-center justify-center gap-3 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
                    Interesse <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">Composto</span>
                </h1>
                <p className="mx-auto max-w-3xl text-base leading-relaxed text-muted-foreground md:text-xl">
                    Simula la crescita del tuo capitale nel tempo con contributi mensili regolari e il potere dell&apos;interesse composto.
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-4">
                    <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                        <CardContent className="space-y-6 p-6">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                                <PiggyBank className="h-5 w-5 text-teal-500" /> Parametri
                            </h3>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Capitale Iniziale</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step={1000}
                                    value={initialCapital}
                                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                                    className="min-h-11 border-teal-200 bg-teal-50/60 text-lg font-bold text-teal-700 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300"
                                />
                                <Slider value={[initialCapital]} min={0} max={200000} step={1000} onValueChange={(value) => setInitialCapital(value[0])} />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contributo Mensile</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step={50}
                                    value={monthlyContribution}
                                    onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                                    className="min-h-11 border-blue-200 bg-blue-50/60 text-lg font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                                />
                                <Slider value={[monthlyContribution]} min={0} max={5000} step={50} onValueChange={(value) => setMonthlyContribution(value[0])} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-end justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rendimento Annuo (%)</Label>
                                    <span className="font-bold text-purple-600 dark:text-purple-400">{annualRate.toFixed(1)}%</span>
                                </div>
                                <Slider value={[annualRate]} min={0} max={15} step={0.5} onValueChange={(value) => setAnnualRate(value[0])} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-end justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Durata (anni)</Label>
                                    <span className="font-bold text-foreground">{years}</span>
                                </div>
                                <Slider value={[years]} min={1} max={50} step={1} onValueChange={(value) => setYears(value[0])} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-end justify-between">
                                    <Label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Inflazione Annua (%)
                                        <InfoTooltip iconClassName="w-3 h-3">Tasso medio di inflazione atteso. Usato per stimare il valore reale (potere d&apos;acquisto odierno) del capitale finale.</InfoTooltip>
                                    </Label>
                                    <span className="font-bold text-rose-600 dark:text-rose-400">{inflationRate.toFixed(1)}%</span>
                                </div>
                                <Slider value={[inflationRate]} min={0} max={10} step={0.1} onValueChange={(value) => setInflationRate(value[0])} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="rounded-3xl border border-border/70 bg-card/80 p-5 text-center shadow-sm backdrop-blur-xl">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Capitale Finale</div>
                            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatEuro(result.finalBalance)}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-center backdrop-blur-xl">
                                <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <Banknote className="h-3 w-3" /> Totale Versato
                                </div>
                                <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{formatEuro(result.totalDeposited)}</div>
                            </div>
                            <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-center backdrop-blur-xl">
                                <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <TrendingUp className="h-3 w-3" /> Interessi Guadagnati
                                </div>
                                <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{formatEuro(result.totalInterest)}</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-muted/50 p-3 text-center">
                            <span className="text-xs font-bold text-muted-foreground">
                                {(result.finalBalance > 0 ? (result.totalInterest / result.finalBalance) * 100 : 0).toFixed(0)}% da interessi composti
                            </span>
                            <InfoTooltip iconClassName="w-3 h-3">Quota del capitale finale generata esclusivamente dagli interessi sugli interessi (effetto compounding), non dai versamenti diretti.</InfoTooltip>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-center backdrop-blur-xl">
                                <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <TrendingDown className="h-3 w-3" /> Valore Reale
                                    <InfoTooltip iconClassName="w-3 h-3">Capitale finale espresso in potere d&apos;acquisto odierno, deflazionato al tasso di inflazione scelto. Risponde alla domanda: &quot;quanto vale davvero oggi la cifra che avro&apos; tra {years} anni?&quot;.</InfoTooltip>
                                </div>
                                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatEuro(result.realFinalBalance)}</div>
                                <div className="mt-0.5 text-[10px] text-muted-foreground">al netto {inflationRate.toFixed(1)}% inflazione</div>
                            </div>
                            <div className="rounded-3xl border border-border/70 bg-card/80 p-4 text-center backdrop-blur-xl">
                                <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    <Sparkles className="h-3 w-3" /> Punto di Svolta
                                    <InfoTooltip iconClassName="w-3 h-3">Primo anno in cui gli interessi maturati superano il totale dei versamenti. E&apos; il momento in cui il capitale &quot;lavora per te&quot; piu&apos; di quanto tu lo alimenti con i contributi.</InfoTooltip>
                                </div>
                                {result.crossoverYear !== null ? (
                                    <>
                                        <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">Anno {result.crossoverYear}</div>
                                        <div className="mt-0.5 text-[10px] text-muted-foreground">interessi &gt; versamenti</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-xl font-extrabold text-muted-foreground">&mdash;</div>
                                        <div className="mt-0.5 text-[10px] text-muted-foreground">non raggiunto in {years} anni</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                        <CardContent className="p-6">
                            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
                                <TrendingUp className="h-5 w-5 text-emerald-500" /> Crescita del Capitale
                            </h3>
                            <div className="h-[380px] md:h-[450px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={result.chartData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="colorVersato" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorInteressi" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} dy={10} interval="preserveStartEnd" />
                                        <YAxis tickFormatter={(value) => `€${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} dx={-10} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "var(--popover)",
                                                backdropFilter: "blur(16px)",
                                                borderRadius: "1rem",
                                                border: "1px solid var(--border)",
                                                boxShadow: "0 20px 40px -10px rgba(15,23,42,0.35)",
                                                color: "var(--popover-foreground)",
                                            }}
                                            formatter={(value: number | string | undefined) => [formatEuro(Number(value ?? 0)), undefined]}
                                        />
                                        <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: 600, color: "var(--muted-foreground)" }} />
                                        <Area type="monotone" dataKey="Versato" stackId="1" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVersato)" />
                                        <Area type="monotone" dataKey="Interessi" stackId="1" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorInteressi)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="mt-6 max-h-72 overflow-auto rounded-2xl border border-border/70">
                                <table className="min-w-[560px] w-full text-sm">
                                    <thead className="sticky top-0 bg-muted/90 backdrop-blur">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Anno</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Versato</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Interessi</th>
                                            <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.chartData.filter((point) => point.anno > 0).map((point) => {
                                            const isCrossover = result.crossoverYear !== null && point.anno === result.crossoverYear;
                                            return (
                                            <tr
                                                key={point.anno}
                                                className={`border-t border-border/60 hover:bg-muted/35 ${isCrossover ? "bg-amber-50/60 dark:bg-amber-950/30" : ""}`}
                                                title={isCrossover ? "Punto di svolta: gli interessi superano il capitale versato" : undefined}
                                            >
                                                <td className="px-3 py-2 font-bold text-foreground">
                                                    {isCrossover && <Sparkles className="mr-1 inline h-3 w-3 text-amber-500" aria-hidden />}
                                                    {point.anno}
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400">{formatEuro(point.Versato)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-purple-600 dark:text-purple-400">{formatEuro(point.Interessi)}</td>
                                                <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatEuro(point.Totale)}</td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
