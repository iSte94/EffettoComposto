"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Target, Activity } from "lucide-react";
import { formatEuro } from "@/lib/format";

interface FireSettingsPanelProps {
    includeIlliquidInFire: boolean;
    birthYear: number;
    retirementAge: number;
    expectedMonthlyExpenses: number;
    monthlySavings: number;
    fireWithdrawalRate: number;
    expectedInflation: number;
    fireExpectedReturn: number;
    fireVolatility: number;
    enablePensionOptimizer: boolean;
    grossIncome: number;
    pensionContribution: number;
    annualTaxRefund: number;
    applyTaxStamp: boolean;
    expectedPublicPension: number;
    publicPensionAge: number;
    onIncludeIlliquidChange: (v: boolean) => void;
    onBirthYearChange: (v: number) => void;
    onRetirementAgeChange: (v: number) => void;
    onExpectedMonthlyExpensesChange: (v: number) => void;
    onMonthlySavingsChange: (v: number) => void;
    onFireWithdrawalRateChange: (v: number) => void;
    onExpectedInflationChange: (v: number) => void;
    onFireExpectedReturnChange: (v: number) => void;
    onFireVolatilityChange: (v: number) => void;
    onEnablePensionOptimizerChange: (v: boolean) => void;
    onGrossIncomeChange: (v: number) => void;
    onPensionContributionChange: (v: number) => void;
    onApplyTaxStampChange: (v: boolean) => void;
    onExpectedPublicPensionChange: (v: number) => void;
    onPublicPensionAgeChange: (v: number) => void;
}

export const FireSettingsPanel = memo(function FireSettingsPanel(props: FireSettingsPanelProps) {
    return (
        <div className="space-y-6 lg:col-span-4">
            <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                <CardHeader className="border-b border-slate-200/80 bg-white/60 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/60 sm:px-6 sm:pt-6">
                    <CardTitle className="flex items-center text-lg font-bold text-slate-900 dark:text-slate-100">
                        <Target className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400" /> Parametri Personali
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-4 sm:p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white/70 p-3 transition-all hover:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800/70">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">Includi Immobili</Label>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">Usa tutto il Net Worth per il FIRE</p>
                            </div>
                            <Switch checked={props.includeIlliquidInFire} onCheckedChange={props.onIncludeIlliquidChange} />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nascita</Label>
                                <Input type="number" value={props.birthYear} onChange={e => props.onBirthYearChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pensione Età</Label>
                                <Input type="number" value={props.retirementAge} onChange={e => props.onRetirementAgeChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100" />
                            </div>
                        </div>

                        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <Label className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Spesa Mensile nel FIRE (€)</Label>
                            <Input type="number" step="50" value={props.expectedMonthlyExpenses} onChange={e => props.onExpectedMonthlyExpensesChange(Number(e.target.value))} className="h-11 border-orange-200 bg-orange-50 font-extrabold text-lg text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Risparmio Mensile PAC (€)</Label>
                            <Input type="number" step="50" value={props.monthlySavings} onChange={e => props.onMonthlySavingsChange(Number(e.target.value))} className="h-11 border-blue-200 bg-blue-50 font-extrabold text-lg text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                <CardHeader className="border-b border-slate-200/80 bg-white/60 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/60 sm:px-6 sm:pt-6">
                    <CardTitle className="flex items-center text-lg font-bold text-slate-900 dark:text-slate-100">
                        <Activity className="mr-3 h-5 w-5 text-purple-600 dark:text-purple-400" /> Variabili di Mercato
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-4 sm:p-6">
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <div className="flex items-end justify-between gap-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Safe Withdrawal Rate (%)</Label>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{props.fireWithdrawalRate.toFixed(2)}%</span>
                            </div>
                            <Slider value={[props.fireWithdrawalRate]} min={2} max={6} step={0.25} onValueChange={(val) => props.onFireWithdrawalRateChange(val[0])} />
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-end justify-between gap-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Inflazione Attesa (%)</Label>
                                <span className="font-bold text-amber-600 dark:text-amber-400">{props.expectedInflation.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.expectedInflation]} min={0} max={10} step={0.5} onValueChange={(val) => props.onExpectedInflationChange(val[0])} />
                            <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">L&apos;inflazione viene sottratta dal rendimento. Tutti i valori sono in euro odierni (potere d&apos;acquisto reale).</p>
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-end justify-between gap-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Rendimento Medio Reale (%)</Label>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{props.fireExpectedReturn.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.fireExpectedReturn]} min={1} max={12} step={0.5} onValueChange={(val) => props.onFireExpectedReturnChange(val[0])} />
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-end justify-between gap-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Volatilita Attesa (%)</Label>
                                <span className="font-bold text-rose-600 dark:text-rose-400">{props.fireVolatility.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.fireVolatility]} min={5} max={30} step={0.5} onValueChange={(val) => props.onFireVolatilityChange(val[0])} />
                            <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">Storicamente un portafoglio 100% azionario globale ha una deviazione standard del 15%. Serve per i test di Monte Carlo.</p>
                        </div>

                        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Ottimizzazione TFR / Fondo Pensione</Label>
                                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Reinveste il rimborso IRPEF annuale sui tuoi versamenti.</p>
                                </div>
                                <button
                                    onClick={() => props.onEnablePensionOptimizerChange(!props.enablePensionOptimizer)}
                                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent px-1 transition-colors duration-200 ease-in-out focus:outline-none ${props.enablePensionOptimizer ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`}
                                    aria-label="Attiva ottimizzazione fondo pensione"
                                >
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${props.enablePensionOptimizer ? "translate-x-6" : "translate-x-0"}`} />
                                </button>
                            </div>

                            {props.enablePensionOptimizer && (
                                <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white/75 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">RAL (€)</Label>
                                        <Input type="number" value={props.grossIncome} onChange={e => props.onGrossIncomeChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Versato (€)</Label>
                                        <Input type="number" value={props.pensionContribution} onChange={e => props.onPensionContributionChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" max={5164} />
                                    </div>
                                    <div className="sm:col-span-2 flex flex-col gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-col">
                                            <span>Rimborso Annuo IRPEF 2024:</span>
                                            <span className="text-[9px] opacity-70">Reinvestito automaticamente a luglio nel calcolo FIRE.</span>
                                        </div>
                                        <span className="text-lg font-bold">+{formatEuro(props.annualTaxRefund)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Pensione INPS e Tasse</Label>
                                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Integra la previdenza pubblica e le tasse italiane.</p>
                                </div>
                            </div>
                            <div className="space-y-4 rounded-xl border border-slate-200 bg-white/75 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800">
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] font-bold uppercase text-slate-900 dark:text-slate-100">Imposta di Bollo</Label>
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400">0.2% annuo sulle attivita finanziarie</p>
                                    </div>
                                    <Switch checked={props.applyTaxStamp} onCheckedChange={props.onApplyTaxStampChange} />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Pensione INPS (€/m)</Label>
                                        <Input type="number" step="100" value={props.expectedPublicPension} onChange={e => props.onExpectedPublicPensionChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Età Pensione</Label>
                                        <Input type="number" value={props.publicPensionAge} onChange={e => props.onPublicPensionAgeChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                                    </div>
                                </div>
                                <p className="rounded-lg bg-blue-50 p-2 text-[9px] leading-tight text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                                    La pensione pubblica ridurra la necessita di prelievo dal tuo capitale dopo i {props.publicPensionAge} anni.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 text-center">
                        <span className="text-xs text-slate-500 dark:text-slate-400">I tuoi parametri vengono salvati automaticamente.</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});
