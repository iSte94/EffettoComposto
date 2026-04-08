"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Briefcase, TrendingUp, Plus, Trash2, Save, PiggyBank, GraduationCap, ArrowUpRight, Scale } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEuro } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePreferences } from "@/hooks/usePreferences";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Flame } from "lucide-react";

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
    const [progressionData, setProgressionData] = useState<CareerProgressionData>(DEFAULT_PROGRESSION);
    const [activePersonTab, setActivePersonTab] = useState<"person1" | "person2">("person1");
    const [showScenarios, setShowScenarios] = useState(false);
    const [currentNetWorth, setCurrentNetWorth] = useState<number>(0);

    const [initialLoadDone, setInitialLoadDone] = useState(false);

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

    const handleUpdatePerson = (person: "person1" | "person2", field: keyof PersonProgression, value: any) => {
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

    const updateBonus = (person: "person1" | "person2", id: string, field: keyof Bonus, value: any) => {
        handleUpdatePerson(person, "promotions", progressionData[person].promotions.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Derived chart data
    const generateChartData = () => {
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
                // Base raises
                const baseP1 = preferences.person1Income > 0 ? preferences.person1Income * 12 : 0;
                const baseP2 = preferences.person2Income > 0 ? preferences.person2Income * 12 : 0;
                
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
    };

    const chartData = useMemo(() => generateChartData(), [progressionData, preferences.person1Income, preferences.person2Income]);

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
    const firePes = calculateFireYear("Pes Reale Famiglia");
    const fireTop = calculateFireYear("Top Reale Famiglia");
    const hasPromotions = progressionData.person1.promotions.length > 0 || progressionData.person2.promotions.length > 0;

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20 pt-6">
            <div className="text-center space-y-4 relative">
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

                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center justify-center">
                    Simula la tua <span className="text-violet-600 dark:text-violet-400 ml-3">Carriera</span>
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                    Prevedi l'evoluzione del tuo reddito nel corso degli anni considerandone l'inflazione e i probabili aumenti salariali.
                </p>

                {/* Hero Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 pt-8">
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl overflow-hidden group hover:shadow-lg shadow-md transition-all duration-500 text-center flex flex-col justify-center">
                        <CardContent className="p-6">
                            <div className="text-xs xl:text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-center"><Briefcase className="w-4 h-4 mr-2 text-blue-500" /> Reddito Familiare Base (Annuo)</div>
                            <div className="text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">{formatEuro(startingTotalIncome)}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-violet-50 dark:bg-violet-900/20 backdrop-blur-xl border border-violet-100 dark:border-violet-800 rounded-3xl overflow-hidden group hover:shadow-lg shadow-md transition-all duration-500 text-center flex flex-col justify-center">
                        <CardContent className="p-6">
                            <div className="text-xs xl:text-sm font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-3 flex items-center justify-center"><TrendingUp className="w-4 h-4 mr-2" /> Reddito Futuro Atteso (Tra {progressionData.yearsToSimulate} anni)</div>
                            <div className="text-3xl lg:text-4xl font-extrabold text-violet-700 dark:text-violet-300 tabular-nums mb-1">{formatEuro(endingTotalNominal)}</div>
                            <div className="text-[10px] bg-violet-100 text-violet-600 font-bold px-2 py-1 rounded-full inline-block">+{totalGrowthPct.toFixed(1)}% Nominale</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-50 dark:bg-amber-900/20 backdrop-blur-xl border border-amber-100 dark:border-amber-800 rounded-3xl overflow-hidden group hover:shadow-lg shadow-md transition-all duration-500 text-center flex flex-col justify-center">
                        <CardContent className="p-6">
                            <div className="text-xs xl:text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3 flex items-center justify-center"><Scale className="w-4 h-4 mr-2" /> Potere d'Acquisto Reale</div>
                            <div className="text-3xl lg:text-4xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">{formatEuro(endingTotalReal)}</div>
                            <p className="text-[10px] text-amber-600/80 mt-2 font-medium leading-tight">Al netto dell'inflazione, questo è il VERO valore che percepirai tra {progressionData.yearsToSimulate} anni.</p>
                        </CardContent>
                    </Card>
                </div>

                {/* FIRE IMPACT WIDGET */}
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center md:justify-between shadow-lg text-white text-left mt-8">
                    <div className="flex-1 w-full">
                        <h3 className="text-xl md:text-2xl font-extrabold flex items-center mb-2 md:mb-3">
                            <div className="p-2 bg-white/20 rounded-xl mr-4"><Flame className="w-6 h-6 text-white fill-white animate-pulse" /></div>
                            Impatto sul tuo FIRE
                        </h3>
                        <p className="text-orange-50 font-medium max-w-2xl text-sm md:text-base opacity-90 leading-relaxed pl-1">
                            {fireBase === new Date().getFullYear() ? (
                                <>Includendo i tuoi asset e balzi di carriera, <strong>sei già finanziariamente libero o lo sarai entro la fine di quest'anno!</strong> 🎉</>
                            ) : (
                                <>Includendo i tuoi balzi di carriera, le promozioni inserite ti permetteranno di raggiungere la Libertà Finanziaria nel <strong>{fireBase !== null ? fireBase : '—'}</strong>.</>
                            )}
                        </p>
                        {hasPromotions && fireBase !== new Date().getFullYear() && (
                            <p className="text-orange-100 mt-2 text-xs font-bold uppercase tracking-wider">
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
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-xl overflow-hidden rounded-3xl">
                        <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 pb-6 pt-6">
                            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex justify-between items-center">
                                Configuratore
                                <div className="space-x-2">
                                    <Label className="text-xs text-slate-500 mr-2">Anni Proiezione</Label>
                                    <Input 
                                        type="number" 
                                        value={progressionData.yearsToSimulate} 
                                        onChange={e => setProgressionData(p => ({...p, yearsToSimulate: Number(e.target.value)}))}
                                        className="inline-block w-16 text-center text-xs h-7"
                                    />
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Tabs value={activePersonTab} onValueChange={(v) => setActivePersonTab(v as any)} className="w-full">
                                <TabsList className="w-full grid justify-center grid-cols-2 rounded-none bg-slate-100 dark:bg-slate-800/50 p-0 h-14 border-b border-slate-200 dark:border-slate-700">
                                    <TabsTrigger value="person1" className="h-full rounded-none data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-500 font-bold">
                                        {person1Name || "Persona 1"}
                                    </TabsTrigger>
                                    <TabsTrigger value="person2" className="h-full rounded-none data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-500 font-bold" disabled={!person2Income}>
                                        {person2Name || "Persona 2"}
                                    </TabsTrigger>
                                </TabsList>
                                <TabsContent value={activePersonTab} className="p-6 m-0 space-y-6">
                                    {activeIncome === 0 ? (
                                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300">
                                            <p className="text-sm text-slate-500">Nessun reddito base configurato per {activeName}. Inserisci il reddito nella scheda Patrimonio.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                                                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Base P.C.</span>
                                                <span className="text-xl font-extrabold text-slate-800 dark:text-slate-200">{formatEuro(activeIncome * 12)} <span className="text-xs font-medium text-slate-400">/anno (netto)</span></span>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-xs uppercase font-bold tracking-wider text-slate-500 flex items-center justify-between">
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
                                                <p className="text-[10px] text-slate-400 leading-tight">Previsione di crescita organica annua (scatti di anzianità, rinnovi CCNL).</p>
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-xs uppercase font-bold tracking-wider text-slate-500 flex items-center justify-between">
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
                                                <p className="text-[10px] text-slate-400 leading-tight">L'inflazione erode il "Potere d'Acquisto Reale" mostrato nel grafico.</p>
                                            </div>

                                            {/* Salti di Carriera */}
                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                                <h4 className="flex items-center text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
                                                    <ArrowUpRight className="w-4 h-4 mr-2 text-emerald-500" /> Salti di Carriera / Promozioni
                                                </h4>
                                                
                                                <div className="space-y-3">
                                                    {activePersonData.promotions.length === 0 ? (
                                                        <p className="text-xs text-slate-400 text-center font-medium italic">Nessun salto previsto.</p>
                                                    ) : activePersonData.promotions.map(promo => (
                                                        <div key={promo.id} className="p-3 bg-white border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-xl relative group hover:border-emerald-300">
                                                            <Button variant="ghost" size="icon" onClick={() => removeBonus(activePersonTab, promo.id)} className="h-6 w-6 absolute -top-2 -right-2 bg-white text-rose-500 opacity-0 group-hover:opacity-100 border border-slate-200 rounded-full hover:bg-rose-50 transition-all">
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                                <div>
                                                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Anno Previsto</Label>
                                                                    <Input type="number" value={promo.targetYear} onChange={e => updateBonus(activePersonTab, promo.id, "targetYear", Number(e.target.value))} className="h-7 text-xs bg-slate-50 focus-visible:ring-emerald-500" />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-[9px] uppercase font-bold text-slate-400">Aumento Netto Annuo</Label>
                                                                    <Input type="number" value={promo.amount} onChange={e => updateBonus(activePersonTab, promo.id, "amount", Number(e.target.value))} className="h-7 text-xs bg-slate-50 focus-visible:ring-emerald-500 font-bold text-emerald-600" />
                                                                </div>
                                                            </div>
                                                            <Input value={promo.description} onChange={e => updateBonus(activePersonTab, promo.id, "description", e.target.value)} placeholder="Es. Promozione Quadro" className="h-7 text-xs border-transparent hover:border-slate-200 bg-transparent px-1 focus-visible:ring-emerald-500" />
                                                        </div>
                                                    ))}
                                                    <Button variant="outline" onClick={() => addBonus(activePersonTab)} className="w-full text-xs py-1 h-8 border-dashed border-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-500">
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
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-xl overflow-hidden rounded-3xl h-full flex flex-col">
                        <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 pb-6 pt-6 flex flex-col md:flex-row md:items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                                    <TrendingUp className="w-5 h-5 mr-3 text-violet-500" /> Andamento Cumulativo
                                </CardTitle>
                                <CardDescription>Confronto tra crescita Nominale (soldi percepiti) e Potere d'Acquisto Reale.</CardDescription>
                            </div>
                            <div className="flex items-center space-x-3 mt-4 md:mt-0 bg-violet-50 dark:bg-slate-800 p-2 px-4 rounded-full border border-violet-100 dark:border-slate-700">
                                <Label htmlFor="scenario-mode" className="text-sm font-bold text-violet-700 dark:text-violet-400 cursor-pointer">Mostra Scenari Paralleli</Label>
                                <Switch id="scenario-mode" checked={showScenarios} onCheckedChange={setShowScenarios} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 md:p-8 flex-grow">
                            <div className="h-[400px] lg:h-[500px] w-full mt-4">
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

                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                        <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} minTickGap={20} />
                                        <YAxis tickFormatter={(val) => `€${Math.round(val / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} width={60} />
                                        
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
                                            labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '4px' }}
                                            itemStyle={{ color: '#334155', border: 'none', fontWeight: 600, fontSize: '13px' }}
                                            formatter={(value: any, name: string | number | undefined) => [formatEuro(Number(value)), name]}
                                        />
                                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569', paddingBottom: '10px' }} />

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
