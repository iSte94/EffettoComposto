"use client";
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Briefcase, TrendingUp, Plus, Trash2, Save, ArrowUpRight, Scale } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEuro } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePreferences } from "@/hooks/usePreferences";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Flame } from "lucide-react";
import { useTheme } from "next-themes";

interface Bonus {
    id: string;
    targetYear: number;
    amount: number;
    description: string;
}

interface PersonProgression {
    annualRaisePct: number;
    expectedInflationPct: number;
    promotions: Bonus[];
}

interface CareerProgressionData {
    yearsToSimulate: number;
    person1: PersonProgression;
    person2: PersonProgression;
}

const DEFAULT_PROGRESSION: CareerProgressionData = {
    yearsToSimulate: 20,
    person1: { annualRaisePct: 3.0, expectedInflationPct: 2.0, promotions: [] },
    person2: { annualRaisePct: 3.0, expectedInflationPct: 2.0, promotions: [] }
};

export function ProgressioneDashboard() {
    const { preferences, updatePreference, isLoaded, isSaving } = usePreferences();
    const { resolvedTheme } = useTheme();
    const [progressionData, setProgressionData] = useState<CareerProgressionData>(DEFAULT_PROGRESSION);
    const [activePersonTab, setActivePersonTab] = useState<"person1" | "person2">("person1");
    const [showScenarios, setShowScenarios] = useState(false);
    const [currentNetWorth, setCurrentNetWorth] = useState<number>(0);

    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const isDark = resolvedTheme === "dark";

    useEffect(() => {
        // Fetch current NetWorth for accurate FIRE estimations
        fetch('/api/patrimonio').then(res => res.json()).then(data => {
            if (data.history && data.history.length > 0) {
                const last = data.history[data.history.length - 1];
                // Calcoliamo gli asset liquidi per allinearci al calcolatore FIRE
                const nw = (last.liquidStockValue || 0) + 
                           (last.safeHavens || 0) + 
                           (last.emergencyFund || 0) + 
                           (last.pensionFund || 0) + 
                           ((last.bitcoinAmount || 0) * (last.bitcoinPrice || 0));
                // Sottraiamo debito solo se non supera gli asset liquidi per evitare negativi che rompono FIRE
                setCurrentNetWorth(Math.max(0, nw - (last.debtsTotal || 0)));
            }
        }).catch(e => console.error(e));
    }, []);

    // Load data only ONCE upon mounting and preferences ready
    useEffect(() => {
        if (isLoaded && !initialLoadDone) {
            if (preferences.careerProgression) {
                try {
                    const parsed = JSON.parse(preferences.careerProgression);
                    if (parsed && typeof parsed === 'object') {
                        setProgressionData({ ...DEFAULT_PROGRESSION, ...parsed });
                    }
                } catch (e) {
                    console.error("Errore nel parsing della career progression", e);
                }
            }
            // Mark load as finished to enable auto-save
            setInitialLoadDone(true);
        }
    }, [isLoaded, preferences.careerProgression, initialLoadDone]);

    // Auto-Save whenever progressionData changes, IF initial load is complete
    useEffect(() => {
        if (initialLoadDone) {
            updatePreference("careerProgression", JSON.stringify(progressionData));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progressionData, initialLoadDone]);

    const handleUpdatePerson = <K extends keyof PersonProgression>(person: "person1" | "person2", field: K, value: PersonProgression[K]) => {
        setProgressionData(prev => ({
            ...prev,
            [person]: {
                ...prev[person],
                [field]: value
            }
        }));
    };

    const addBonus = (person: "person1" | "person2") => {
        const newBonus: Bonus = { id: Math.random().toString(36).substring(7), targetYear: new Date().getFullYear() + 2, amount: 5000, description: "Promozione Quadro" };
        handleUpdatePerson(person, "promotions", [...progressionData[person].promotions, newBonus]);
        toast.success("Salto di carriera aggiunto. Ricorda che viene applicato IN AGGIUNTA al reddito precedente.");
    };

    const removeBonus = (person: "person1" | "person2", id: string) => {
        handleUpdatePerson(person, "promotions", progressionData[person].promotions.filter(p => p.id !== id));
    };

    const updateBonus = <K extends keyof Bonus>(person: "person1" | "person2", id: string, field: K, value: Bonus[K]) => {
        handleUpdatePerson(person, "promotions", progressionData[person].promotions.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Derived chart data
    const generateChartData = useCallback(() => {
        const currentYear = new Date().getFullYear();
        const data = [];

        let currentIncome1 = preferences.person1Income > 0 ? preferences.person1Income * 12 : 0;
        let currentIncome2 = preferences.person2Income > 0 ? preferences.person2Income * 12 : 0;
        
        let realIncome1 = currentIncome1;
        let realIncome2 = currentIncome2;

        for (let i = 0; i <= progressionData.yearsToSimulate; i++) {
            const year = currentYear + i;
            const p1Bonuses = progressionData.person1.promotions.filter(p => p.targetYear === year).reduce((acc, curr) => acc + curr.amount, 0);
            const p2Bonuses = progressionData.person2.promotions.filter(p => p.targetYear === year).reduce((acc, curr) => acc + curr.amount, 0);
            if (i > 0) {
                currentIncome1 = currentIncome1 * (1 + progressionData.person1.annualRaisePct / 100) + p1Bonuses;
                currentIncome2 = currentIncome2 * (1 + progressionData.person2.annualRaisePct / 100) + p2Bonuses;
            }
            const inflationPurchasingPowerRatio1 = Math.pow(1 + progressionData.person1.expectedInflationPct / 100, i);
            const inflationPurchasingPowerRatio2 = Math.pow(1 + progressionData.person2.expectedInflationPct / 100, i);
            realIncome1 = currentIncome1 / inflationPurchasingPowerRatio1;
            realIncome2 = currentIncome2 / inflationPurchasingPowerRatio2;

            // Scenario calculations
            let topIncomeC1 = currentIncome1, topIncomeC2 = currentIncome2;
            let pesIncomeC1 = currentIncome1, pesIncomeC2 = currentIncome2;
            
            if (i > 0) {
                // TOP: +3% extra raise per year + recurring job hopping (+15% every 4 years)
                const isHopping = i % 4 === 0 && i > 0;
                topIncomeC1 = data[i-1]["Top P1 (Nom)"] * (1 + (progressionData.person1.annualRaisePct + 3) / 100) * (isHopping ? 1.15 : 1) + p1Bonuses;
                topIncomeC2 = data[i-1]["Top P2 (Nom)"] * (1 + (progressionData.person2.annualRaisePct + 3) / 100) * (isHopping ? 1.15 : 1) + p2Bonuses;

                // PESSIMISTA: -2% raise (min 0), double inflation, no bonuses
                const pesRaise1 = Math.max(0, progressionData.person1.annualRaisePct - 2) / 100;
                const pesRaise2 = Math.max(0, progressionData.person2.annualRaisePct - 2) / 100;
                pesIncomeC1 = data[i-1]["Pes P1 (Nom)"] * (1 + pesRaise1);
                pesIncomeC2 = data[i-1]["Pes P2 (Nom)"] * (1 + pesRaise2);
            } else {
                topIncomeC1 = currentIncome1; topIncomeC2 = currentIncome2;
                pesIncomeC1 = currentIncome1; pesIncomeC2 = currentIncome2;
            }

            const pesInflRatio1 = Math.pow(1 + (progressionData.person1.expectedInflationPct + 3) / 100, i);
            const pesInflRatio2 = Math.pow(1 + (progressionData.person2.expectedInflationPct + 3) / 100, i);

            data.push({
                year: year,
                "Nominale P1": currentIncome1, "Reale P1 (P. Acq.)": realIncome1,
                "Nominale P2": currentIncome2, "Reale P2 (P. Acq.)": realIncome2,
                "Totale Nominale Famiglia": currentIncome1 + currentIncome2,
                "Totale Reale Famiglia": realIncome1 + realIncome2,
                "Top P1 (Nom)": topIncomeC1, "Top P2 (Nom)": topIncomeC2,
                "Pes P1 (Nom)": pesIncomeC1, "Pes P2 (Nom)": pesIncomeC2,
                "Top Reale Famiglia": (topIncomeC1 / inflationPurchasingPowerRatio1) + (topIncomeC2 / inflationPurchasingPowerRatio2),
                "Pes Reale Famiglia": (pesIncomeC1 / pesInflRatio1) + (pesIncomeC2 / pesInflRatio2),
            });
        }
        return data;
    }, [progressionData, preferences.person1Income, preferences.person2Income]);

    const chartData = useMemo(() => generateChartData(), [generateChartData]);

    if (!isLoaded) {
        return (
            <div className="space-y-10 animate-in fade-in duration-700 pb-20 pt-6">
                <Skeleton className="h-24 w-full rounded-3xl" />
                <Skeleton className="h-[500px] w-full rounded-3xl" />
            </div>
        );
    }

    const { person1Name, person1Income, person2Name, person2Income } = preferences;
    const activePersonData = activePersonTab === "person1" ? progressionData.person1 : progressionData.person2;
    const activeIncome = activePersonTab === "person1" ? person1Income : person2Income;
    const activeName = activePersonTab === "person1" ? person1Name : person2Name;

    // Stats calculations
    const finalYearData = chartData[chartData.length - 1];
    const startingTotalIncome = chartData[0]["Totale Nominale Famiglia"];
    const endingTotalNominal = finalYearData["Totale Nominale Famiglia"];
    const endingTotalReal = finalYearData["Totale Reale Famiglia"];
    const totalGrowthPct = startingTotalIncome > 0 ? ((endingTotalNominal - startingTotalIncome) / startingTotalIncome) * 100 : 0;

    // FIRE calculations
    const calculateFireYear = (incomeKey: string) => {
        let wealth = currentNetWorth;
        // fallback to some defaults if FIRE params not set
        const expenses = (preferences.expectedMonthlyExpenses || 2500) * 12;
        const target = expenses / ((preferences.fireWithdrawalRate || 3.25) / 100);
        const returnRate = (preferences.fireExpectedReturn || 6) / 100;
        
        for (let i = 0; i < 50; i++) {
            const yearData = chartData[i] || chartData[chartData.length - 1];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const income = yearData ? (yearData as any)[incomeKey] : (chartData[chartData.length - 1] as any)[incomeKey];
            const savings = Math.max(0, income - expenses);
            wealth = wealth * (1 + returnRate) + savings;
            if (wealth >= target) {
                return new Date().getFullYear() + i;
            }
        }
        return null;
    };

    const fireBase = calculateFireYear("Totale Reale Famiglia");
    const fireTop = calculateFireYear("Top Reale Famiglia");
    const hasPromotions = progressionData.person1.promotions.length > 0 || progressionData.person2.promotions.length > 0;

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20 pt-6">
            <div className="relative space-y-4 text-center">
                <div className={`absolute top-0 right-4 md:right-8 transition-all duration-500 flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border ${isSaving ? 'border-amber-200 opacity-100 transform translate-y-0 text-amber-600' : 'border-emerald-200 opacity-100 transform translate-y-0 text-emerald-600'}`}>
                    {isSaving ? (
                        <div className="flex items-center text-xs font-bold gap-1.5">
                            <div className="w-2.5 h-2.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> Salvataggio...
                        </div>
                    ) : (
                        <div className="flex items-center text-xs font-bold gap-1">
                            <Save className="w-3.5 h-3.5 fill-emerald-100" /> Salvato
                        </div>
                    )}
                </div>

                <h2 className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
                    Simula la tua <span className="text-violet-600 dark:text-violet-400 ml-3">Carriera</span>
                </h2>
                <p className="mx-auto max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Prevedi l'evoluzione del tuo reddito nel corso degli anni considerandone l'inflazione e i probabili aumenti salariali.
                </p>

                {/* Hero Stats */}
                <div className="grid grid-cols-1 gap-4 pt-8 md:grid-cols-3 lg:gap-5">
                    <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden text-center transition-all duration-300 hover:shadow-md">
                        <CardContent className="p-5 sm:p-6">
                            <div className="mb-3 flex items-center justify-center text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground"><Briefcase className="w-4 h-4 mr-2 text-blue-500" /> Reddito Familiare Base (Annuo)</div>
                            <div className="tabular-nums text-3xl font-extrabold text-card-foreground lg:text-4xl">{formatEuro(startingTotalIncome)}</div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-3xl border border-violet-100/80 bg-violet-50/80 text-center shadow-sm transition-all duration-300 hover:shadow-md dark:border-violet-900/70 dark:bg-violet-950/25">
                        <CardContent className="p-5 sm:p-6">
                            <div className="mb-3 flex items-center justify-center text-[11px] font-bold uppercase tracking-[0.22em] text-violet-600 dark:text-violet-400"><TrendingUp className="w-4 h-4 mr-2" /> Reddito Futuro Atteso (Tra {progressionData.yearsToSimulate} anni)</div>
                            <div className="mb-1 tabular-nums text-3xl font-extrabold text-violet-700 dark:text-violet-300 lg:text-4xl">{formatEuro(endingTotalNominal)}</div>
                            <div className="inline-block rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">+{totalGrowthPct.toFixed(1)}% Nominale</div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-3xl border border-amber-100/80 bg-amber-50/80 text-center shadow-sm transition-all duration-300 hover:shadow-md dark:border-amber-900/70 dark:bg-amber-950/25">
                        <CardContent className="p-5 sm:p-6">
                            <div className="mb-3 flex items-center justify-center text-[11px] font-bold uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400"><Scale className="w-4 h-4 mr-2" /> Potere d'Acquisto Reale</div>
                            <div className="tabular-nums text-3xl font-extrabold text-amber-700 dark:text-amber-300 lg:text-4xl">{formatEuro(endingTotalReal)}</div>
                            <p className="text-[10px] text-amber-600/80 mt-2 font-medium leading-tight">Al netto dell'inflazione, questo è il VERO valore che percepirai tra {progressionData.yearsToSimulate} anni.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* FIRE IMPACT WIDGET */}
                <div className="mt-8 rounded-3xl bg-gradient-to-r from-orange-500 to-rose-500 p-5 text-left text-white shadow-lg md:flex md:items-center md:justify-between md:p-8">
                    <div className="w-full flex-1">
                        <h3 className="mb-2 flex items-center text-xl font-extrabold md:mb-3 md:text-2xl">
                            <div className="mr-4 rounded-xl bg-white/20 p-2"><Flame className="w-6 h-6 text-white fill-white animate-pulse" /></div>
                            Impatto sul tuo FIRE
                        </h3>
                        <p className="max-w-2xl pl-1 text-sm font-medium leading-relaxed text-orange-50 opacity-90 md:text-base">
                            {fireBase === new Date().getFullYear() ? (
                                <>Includendo i tuoi asset e balzi di carriera, <strong>sei già finanziariamente libero o lo sarai entro la fine di quest'anno!</strong> 🎉</>
                            ) : (
                                <>Includendo i tuoi balzi di carriera, le promozioni inserite ti permetteranno di raggiungere la Libertà Finanziaria nel <strong>{fireBase !== null ? fireBase : '—'}</strong>.</>
                            )}
                        </p>
                        {hasPromotions && fireBase !== new Date().getFullYear() && (
                            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-orange-100">
                                Boom! 🚀 Hai accelerato il traguardo rispetto alla crescita organica liscia.
                            </p>
                        )}
                    </div>
                    {fireBase && fireTop && fireTop < fireBase && showScenarios && (
                        <div className="hidden md:flex flex-col items-end">
                            <div className="text-xs uppercase font-bold text-orange-200">Scenario "Top" Anticipa di:</div>
                            <div className="text-4xl font-black">{Math.max(0, fireBase - fireTop)} anni!</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Inputs & Settings */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Person Settings */}
                <div className="space-y-6 lg:col-span-1">
                    <Card className="overflow-hidden rounded-3xl bg-card/80 backdrop-blur-xl border border-border/70 shadow-sm">
                        <CardHeader className="border-b border-border/70 bg-muted/40 pb-5 pt-5 sm:pb-6 sm:pt-6">
                            <CardTitle className="flex flex-col gap-3 text-xl font-bold text-foreground sm:flex-row sm:items-center sm:justify-between">
                                Configuratore
                                <div className="space-x-2">
                                    <Label className="mr-2 text-xs text-muted-foreground">Anni Proiezione</Label>
                                    <Input 
                                        type="number" 
                                        value={progressionData.yearsToSimulate} 
                                        onChange={e => setProgressionData(p => ({...p, yearsToSimulate: Number(e.target.value)}))}
                                        className="inline-block h-9 w-20 text-center text-xs tabular-nums"
                                    />
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Tabs value={activePersonTab} onValueChange={(v) => setActivePersonTab(v as "person1" | "person2") } className="w-full">
                                <TabsList className="grid h-auto w-full grid-cols-2 justify-center rounded-none border-b border-border/70 bg-muted/60 p-0">
                                    <TabsTrigger value="person1" className="min-h-12 rounded-none font-bold data-[state=active]:border-b-2 data-[state=active]:border-violet-500 data-[state=active]:bg-background data-[state=active]:shadow-none">
                                        {person1Name || "Persona 1"}
                                    </TabsTrigger>
                                    <TabsTrigger value="person2" className="min-h-12 rounded-none font-bold data-[state=active]:border-b-2 data-[state=active]:border-violet-500 data-[state=active]:bg-background data-[state=active]:shadow-none" disabled={!person2Income}>
                                        {person2Name || "Persona 2"}
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value={activePersonTab} className="m-0 space-y-6 p-4 sm:p-6">
                                    {activeIncome === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/50 p-4 text-center">
                                            <p className="text-sm text-slate-500">Nessun reddito base configurato per {activeName}. Inserisci il reddito nella scheda Patrimonio.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                <span className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Base P.C.</span>
                                                <span className="text-xl font-extrabold text-foreground tabular-nums">{formatEuro(activeIncome * 12)} <span className="text-xs font-medium text-muted-foreground">/anno (netto)</span></span>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                    Aumento Annuo Costante (%)
                                                    <span className="text-violet-600 font-extrabold">{activePersonData.annualRaisePct}%</span>
                                                </Label>
                                                <input 
                                                    type="range" 
                                                    min="-2" 
                                                    max="15" 
                                                    step="0.5" 
                                                    value={activePersonData.annualRaisePct} 
                                                    onChange={e => handleUpdatePerson(activePersonTab, "annualRaisePct", Number(e.target.value))}
                                                    className="w-full accent-violet-600" 
                                                />
                                                <p className="text-[10px] leading-tight text-muted-foreground">Previsione di crescita organica annua (scatti di anzianità, rinnovi CCNL).</p>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                    Inflazione Stimata (%)
                                                    <span className="text-amber-500 font-extrabold">{activePersonData.expectedInflationPct}%</span>
                                                </Label>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max="10" 
                                                    step="0.5" 
                                                    value={activePersonData.expectedInflationPct} 
                                                    onChange={e => handleUpdatePerson(activePersonTab, "expectedInflationPct", Number(e.target.value))}
                                                    className="w-full accent-amber-500" 
                                                />
                                                <p className="text-[10px] leading-tight text-muted-foreground">L'inflazione erode il "Potere d'Acquisto Reale" mostrato nel grafico.</p>
                                            </div>

                                            {/* Salti di Carriera */}
                                            <div className="border-t border-border/70 pt-6">
                                                <h4 className="mb-4 flex items-center text-sm font-bold text-foreground">
                                                    <ArrowUpRight className="w-4 h-4 mr-2 text-emerald-500" /> Salti di Carriera / Promozioni
                                                </h4>
                                                
                                                <div className="space-y-3">
                                                    {activePersonData.promotions.length === 0 ? (
                                                        <p className="text-center text-xs font-medium italic text-muted-foreground">Nessun salto previsto.</p>
                                                    ) : activePersonData.promotions.map(promo => (
                                                        <div key={promo.id} className="group relative rounded-xl border border-border/70 bg-background/80 p-3">
                                                            <Button variant="ghost" size="icon" onClick={() => removeBonus(activePersonTab, promo.id)} className="absolute -right-2 -top-2 h-7 w-7 rounded-full border border-border bg-background text-rose-500 opacity-0 transition-all hover:bg-rose-50 group-hover:opacity-100">
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                                <div>
                                                                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">Anno Previsto</Label>
                                                                    <Input type="number" value={promo.targetYear} onChange={e => updateBonus(activePersonTab, promo.id, "targetYear", Number(e.target.value))} className="h-9 text-xs bg-background/80 focus-visible:ring-emerald-500 tabular-nums" />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">Aumento Netto Annuo</Label>
                                                                    <Input type="number" value={promo.amount} onChange={e => updateBonus(activePersonTab, promo.id, "amount", Number(e.target.value))} className="h-9 text-xs bg-background/80 font-bold text-emerald-600 focus-visible:ring-emerald-500 tabular-nums" />
                                                                </div>
                                                            </div>
                                                            <Input value={promo.description} onChange={e => updateBonus(activePersonTab, promo.id, "description", e.target.value)} placeholder="Es. Promozione Quadro" className="h-9 border-transparent bg-transparent px-1 text-xs focus-visible:ring-emerald-500 hover:border-border/70" />
                                                        </div>
                                                    ))}
                                                    <Button variant="outline" onClick={() => addBonus(activePersonTab)} className="h-10 w-full border-2 border-dashed text-xs text-muted-foreground hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700">
                                                        <Plus className="w-3 h-3 mr-1" /> Aggiungi Scatto
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Big Chart */}
                <div className="lg:col-span-2">
                    <Card className="h-full flex flex-col overflow-hidden rounded-3xl bg-card/80 backdrop-blur-xl border border-border/70 shadow-sm">
                        <CardHeader className="flex flex-col justify-between border-b border-border/70 bg-muted/40 pb-5 pt-5 sm:pb-6 sm:pt-6 md:flex-row md:items-center">
                            <div>
                                <CardTitle className="flex items-center text-xl font-bold text-foreground">
                                    <TrendingUp className="w-5 h-5 mr-3 text-violet-500" /> Andamento Cumulativo
                                </CardTitle>
                                <CardDescription>Confronto tra crescita Nominale (soldi percepiti) e Potere d'Acquisto Reale.</CardDescription>
                            </div>
                            <div className="mt-4 flex items-center gap-3 rounded-full border border-violet-100/80 bg-violet-50/80 px-4 py-2 md:mt-0 dark:border-slate-700 dark:bg-slate-800/70">
                                <Label htmlFor="scenario-mode" className="cursor-pointer text-sm font-bold text-violet-700 dark:text-violet-400">Mostra Scenari Paralleli</Label>
                                <Switch id="scenario-mode" checked={showScenarios} onCheckedChange={setShowScenarios} />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow p-4 sm:p-6 md:p-8">
                            <div className="mt-4 h-[320px] w-full sm:h-[380px] lg:h-[500px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>

                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.06)"} />
                                        <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: isDark ? "#cbd5e1" : "#64748b", fontSize: 12, fontWeight: 600 }} dy={10} minTickGap={20} />
                                        <YAxis tickFormatter={(val) => `€${Math.round(val / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} width={60} />
                                        
                                        <Tooltip
                                            contentStyle={{ backgroundColor: isDark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.96)", backdropFilter: "blur(16px)", borderRadius: "1rem", border: isDark ? "1px solid rgba(51, 65, 85, 0.9)" : "1px solid rgba(148, 163, 184, 0.24)", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)" }}
                                            labelStyle={{ fontWeight: "bold", color: isDark ? "#f8fafc" : "#0f172a", marginBottom: "8px", borderBottom: `1px solid ${isDark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.06)"}`, paddingBottom: "4px" }}
                                            itemStyle={{ color: isDark ? "#cbd5e1" : "#334155", border: "none", fontWeight: 600, fontSize: "13px" }}
                                            formatter={(value: string | number | undefined, name: string | number | undefined) => [formatEuro(Number(value ?? 0)), name]}
                                        />
                                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: 600, color: isDark ? "#cbd5e1" : "#475569", paddingBottom: "10px" }} />

                                        <Area type="monotone" dataKey="Totale Nominale Famiglia" name="Reddito Nominale Famiglia" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#colorNominal)" activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }} />
                                        <Area type="monotone" dataKey="Totale Reale Famiglia" name="P. Acq. Reale Famiglia" stroke="#f59e0b" strokeWidth={3} strokeDasharray="5 5" fillOpacity={showScenarios ? 0 : 1} fill="url(#colorReal)" activeDot={false} />
                                        
                                        {showScenarios ? (
                                            <>
                                                <Area type="monotone" dataKey="Top Reale Famiglia" name="Scenario Top (Reale)" stroke="#10b981" strokeWidth={3} strokeDasharray="3 3" fillOpacity={0} activeDot={{ r: 6, fill: '#10b981' }} />
                                                <Area type="monotone" dataKey="Pes Reale Famiglia" name="Scenario Cigno Nero (Reale)" stroke="#ef4444" strokeWidth={3} strokeDasharray="3 3" fillOpacity={0} activeDot={{ r: 6, fill: '#ef4444' }} />
                                            </>
                                        ) : (
                                            <>
                                                {person1Income > 0 && <Line type="monotone" dataKey="Nominale P1" name={`Nominale (${person1Name})`} stroke="#3b82f6" strokeWidth={2} dot={false} strokeOpacity={0.6} />}
                                                {person2Income > 0 && <Line type="monotone" dataKey="Nominale P2" name={`Nominale (${person2Name})`} stroke="#10b981" strokeWidth={2} dot={false} strokeOpacity={0.6} />}
                                            </>
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}




