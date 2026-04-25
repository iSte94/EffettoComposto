"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp, Banknote, PiggyBank, Sparkles, TrendingDown, Repeat2, Flame, Hourglass } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatEuro } from "@/lib/format";
import { computeRealReturn } from "@/lib/finance/fire-projection";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend,
} from "recharts";

// SWR (Safe Withdrawal Rate) di default usato nel resto dell'app per calcoli
// FIRE (vedi DEFAULT_FIRE_WITHDRAWAL_RATE in fire-metrics.ts). Piu' conservativo
// del classico 4% Trinity, prudente per orizzonti lunghi tipici italiani.
const DEFAULT_SWR_PCT = 3.25;

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
        // Capitale a fine "anno N - 1": ci serve come scenario di confronto per
        // il "Costo del Ritardo": iniziare un anno dopo equivale, a parita' di
        // orizzonte finale, a ottenere il saldo che oggi avresti dopo years-1
        // anni (un anno in meno di accumulo + capitalizzazione).
        let balanceMinusOne = initialCapital;

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
            if (year === years - 1) {
                balanceMinusOne = balance;
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
        // Edge case: con orizzonte di 1 solo anno, "anno N - 1" == oggi (capitale iniziale).
        if (years <= 1) {
            balanceMinusOne = initialCapital;
        }

        // Valore reale a potere d'acquisto odierno: deflaziona il nominale finale.
        const inflationFactor = Math.pow(1 + inflationRate / 100, years);
        const realFinalBalance = inflationFactor > 0 ? balance / inflationFactor : balance;
        // Guadagno reale: crescita effettiva del potere d'acquisto rispetto a quanto versato.
        // Se negativo, l'inflazione ha eroso piu' di quanto il rendimento abbia prodotto.
        const realGain = realFinalBalance - totalDeposited;

        // Tempo di raddoppio: ln(2) / ln(1+r), formula esatta (piu' accurata
        // della Regola del 72). `null` se r <= 0 (il capitale non raddoppia mai
        // per sola capitalizzazione). Mostrato in parallelo al "Tempo di
        // Dimezzamento" del Calcolatore Inflazione per simmetria educativa.
        const doublingYearsNominal =
            annualRate > 0 ? Math.log(2) / Math.log(1 + annualRate / 100) : null;
        const realReturnPct = computeRealReturn(annualRate, inflationRate) * 100;
        const doublingYearsReal =
            realReturnPct > 0 ? Math.log(2) / Math.log(1 + realReturnPct / 100) : null;

        // Rendita FIRE teorica: applica il SWR di default al capitale finale.
        // Usiamo il valore REALE (deflazionato) perche' l'utente ragiona in
        // potere d'acquisto odierno quando valuta se la cifra "basta per
        // vivere"; il valore nominale e' solo informativo/secondario.
        // Formula: rendita_annua = capitale * SWR; rendita_mensile = /12.
        const swrFactor = DEFAULT_SWR_PCT / 100;
        const fireMonthlyIncomeReal = Math.max(0, (realFinalBalance * swrFactor) / 12);
        const fireMonthlyIncomeNominal = Math.max(0, (balance * swrFactor) / 12);

        // Costo del Ritardo (1 anno): a parita' di orizzonte, rinviare di 12 mesi
        // l'inizio del piano significa accumulare/capitalizzare per un anno in
        // meno. La differenza fra "capitale finale oggi" e "capitale finale se
        // avessi iniziato fra un anno" quantifica il costo della procrastinazione
        // ed e' tipicamente sproporzionato rispetto a quanto si rinuncia a
        // versare in 12 mesi (e' il guadagno NETTO di compound che si perde).
        // Disponibile solo per orizzonti >= 2 anni (con 1 anno il confronto
        // degenera al capitale iniziale).
        const delayCostNominal = years >= 2 ? Math.max(0, balance - balanceMinusOne) : null;
        const delayMissedContributions = years >= 2 ? monthlyContribution * 12 : 0;
        // Quota della perdita imputabile esclusivamente al compounding mancato
        // (al netto dei 12 versamenti che non hai fatto): il vero "regalo" che
        // l'effetto composto fa a chi inizia un anno prima.
        const delayCompoundLoss =
            delayCostNominal !== null
                ? Math.max(0, delayCostNominal - delayMissedContributions)
                : null;

        return {
            finalBalance: balance,
            totalDeposited,
            totalInterest: balance - totalDeposited,
            chartData,
            crossoverYear,
            realFinalBalance,
            realGain,
            doublingYearsNominal,
            doublingYearsReal,
            realReturnPct,
            fireMonthlyIncomeReal,
            fireMonthlyIncomeNominal,
            delayCostNominal,
            delayMissedContributions,
            delayCompoundLoss,
        };
    }, [initialCapital, monthlyContribution, annualRate, years, inflationRate]);

    // Etichetta compatta per il tempo di raddoppio: intero se >= 10 anni
    // (precisione sub-annuale trascurabile sulla scala decennale), una cifra
    // decimale sotto per differenziare rendimenti bassi (es. 7.3 anni).
    const formatDoublingYears = (value: number | null) => {
        if (value === null || !Number.isFinite(value)) return null;
        return value >= 10 ? `${Math.round(value)} anni` : `${value.toFixed(1)} anni`;
    };
    const doublingNominalLabel = formatDoublingYears(result.doublingYearsNominal);
    const doublingRealLabel = formatDoublingYears(result.doublingYearsReal);

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

                        <div className="rounded-3xl border border-border/70 bg-card/80 p-4 backdrop-blur-xl">
                            <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {result.realGain >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} Guadagno Reale
                                <InfoTooltip iconClassName="w-3 h-3">Crescita effettiva del potere d&apos;acquisto: valore reale finale meno totale versato. Se positivo hai davvero arricchito il tuo capitale al netto dell&apos;inflazione; se negativo l&apos;inflazione ha eroso piu&apos; di quanto il rendimento abbia prodotto, nonostante il saldo nominale sembri cresciuto.</InfoTooltip>
                            </div>
                            <div className={`text-center text-2xl font-extrabold ${result.realGain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {result.realGain >= 0 ? "+" : ""}{formatEuro(result.realGain)}
                            </div>
                            <div className="mt-1 text-center text-[10px] text-muted-foreground">
                                {result.realGain >= 0
                                    ? `potere d'acquisto in piu' rispetto ai ${formatEuro(result.totalDeposited)} versati`
                                    : `potere d'acquisto perso rispetto ai ${formatEuro(result.totalDeposited)} versati`}
                            </div>
                        </div>

                        <div
                            className="rounded-3xl border border-teal-200 bg-teal-50/70 p-4 dark:border-teal-900 dark:bg-teal-950/30"
                            title={
                                doublingNominalLabel
                                    ? `Al ${annualRate.toFixed(1)}% annuo nominale, per sola capitalizzazione il capitale raddoppia ogni ${doublingNominalLabel}.`
                                    : "Con rendimento nullo o negativo il capitale non raddoppia per sola capitalizzazione."
                            }
                        >
                            <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                                <Repeat2 className="h-3 w-3" /> Tempo di Raddoppio
                                <InfoTooltip iconClassName="w-3 h-3">Anni necessari perche&apos; il capitale raddoppi per sola capitalizzazione degli interessi (senza nuovi versamenti). Formula esatta: ln(2) / ln(1 + r), piu&apos; precisa della Regola del 72. Il valore reale e&apos; calcolato sul rendimento al netto dell&apos;inflazione.</InfoTooltip>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-center">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-500/80 dark:text-teal-400/70">Nominale</div>
                                    <div className="text-lg font-extrabold text-teal-700 dark:text-teal-300">
                                        {doublingNominalLabel ?? <span className="text-muted-foreground">&mdash;</span>}
                                    </div>
                                    <div className="text-[10px] text-teal-600/70 dark:text-teal-400/60">al {annualRate.toFixed(1)}% annuo</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/70">Reale</div>
                                    <div className={`text-lg font-extrabold ${doublingRealLabel ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
                                        {doublingRealLabel ?? <span>&mdash;</span>}
                                    </div>
                                    <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">
                                        {doublingRealLabel
                                            ? `al ${result.realReturnPct.toFixed(1)}% reale`
                                            : "rendimento reale <= 0"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50/70 to-amber-50/60 p-4 dark:border-orange-900 dark:from-orange-950/30 dark:to-amber-950/20"
                            title={`Al ${DEFAULT_SWR_PCT}% SWR (Safe Withdrawal Rate), il capitale reale finale di ${formatEuro(result.realFinalBalance)} puo' sostenere un prelievo mensile di circa ${formatEuro(result.fireMonthlyIncomeReal)} in potere d'acquisto odierno, teoricamente a tempo indefinito.`}
                        >
                            <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                                <Flame className="h-3 w-3" /> Rendita Mensile FIRE
                                <InfoTooltip iconClassName="w-3 h-3">Rendita mensile teorica generata dal capitale finale applicando un Safe Withdrawal Rate del {DEFAULT_SWR_PCT}% (prudente rispetto al classico 4% Trinity). Il valore principale e&apos; espresso in potere d&apos;acquisto odierno (euro reali), cosi&apos; puoi confrontarlo subito con le tue spese mensili attuali e capire se il capitale accumulato basterebbe per vivere di rendita.</InfoTooltip>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-extrabold text-orange-700 dark:text-orange-300">
                                    {formatEuro(result.fireMonthlyIncomeReal)}<span className="text-sm font-semibold text-orange-600/80 dark:text-orange-400/80">/mese</span>
                                </div>
                                <div className="mt-0.5 text-[10px] text-orange-600/80 dark:text-orange-400/70">
                                    in euro odierni, al {DEFAULT_SWR_PCT}% SWR
                                </div>
                                {result.fireMonthlyIncomeNominal > result.fireMonthlyIncomeReal + 1 && (
                                    <div className="mt-1 text-[10px] text-muted-foreground">
                                        nominali fra {years} anni: {formatEuro(result.fireMonthlyIncomeNominal)}/mese
                                    </div>
                                )}
                            </div>
                        </div>

                        {result.delayCostNominal !== null && result.delayCostNominal > 0 && (
                            <div
                                className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50/70 to-amber-50/60 p-4 dark:border-rose-900 dark:from-rose-950/30 dark:to-amber-950/20"
                                title={`Rinviando di 12 mesi l'inizio del piano (a parita' di orizzonte di ${years} anni) il capitale finale scende di ${formatEuro(result.delayCostNominal)}: ${formatEuro(result.delayMissedContributions)} sono i 12 versamenti mancati, ${formatEuro(result.delayCompoundLoss ?? 0)} e' il compounding che non hai messo al lavoro.`}
                            >
                                <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">
                                    <Hourglass className="h-3 w-3" /> Costo del Ritardo (1 anno)
                                    <InfoTooltip iconClassName="w-3 h-3">A parita&apos; di orizzonte finale, iniziare a investire 12 mesi piu&apos; tardi ti fa perdere questo importo a fine piano. Comprende i 12 contributi non versati e, soprattutto, il compounding che NON ha potuto lavorare per quei 12 mesi extra: il compound &eacute; quasi sempre la quota piu&apos; pesante e cresce esponenzialmente con l&apos;orizzonte. E&apos; il numero che traduce in euro il costo della procrastinazione.</InfoTooltip>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">
                                        -{formatEuro(result.delayCostNominal)}
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-rose-600/80 dark:text-rose-400/70">
                                        in meno a fine piano se inizi fra 12 mesi
                                    </div>
                                    {result.delayCompoundLoss !== null && result.delayCompoundLoss > 0 && (
                                        <div className="mt-1 text-[10px] text-muted-foreground">
                                            di cui {formatEuro(result.delayCompoundLoss)} di solo compound mancato
                                            {result.delayMissedContributions > 0 && (
                                                <>
                                                    <span className="mx-1">&middot;</span>
                                                    {formatEuro(result.delayMissedContributions)} di versamenti saltati
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
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
