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
    // Personal params
    includeIlliquidInFire: boolean;
    birthYear: number;
    retirementAge: number;
    expectedMonthlyExpenses: number;
    monthlySavings: number;
    // Market vars
    fireWithdrawalRate: number;
    expectedInflation: number;
    fireExpectedReturn: number;
    fireVolatility: number;
    // Pension optimizer
    enablePensionOptimizer: boolean;
    grossIncome: number;
    pensionContribution: number;
    annualTaxRefund: number;
    // Tax & pension
    applyTaxStamp: boolean;
    expectedPublicPension: number;
    publicPensionAge: number;
    // Callbacks
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
        <div className="lg:col-span-4 space-y-6">
            {/* Personal Parameters */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500">
                <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 pb-4 pt-6 px-6">
                    <CardTitle className="text-lg font-bold flex items-center text-slate-900 dark:text-slate-100">
                        <Target className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" /> Parametri Personali
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 border border-slate-200 p-3 rounded-xl transition-all hover:bg-white/80 hover:shadow-sm">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">Includi Immobili</Label>
                                <p className="text-[10px] text-slate-500">Usa tutto il Net Worth per il FIRE</p>
                            </div>
                            <Switch checked={props.includeIlliquidInFire} onCheckedChange={props.onIncludeIlliquidChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nascita</Label>
                                <Input type="number" value={props.birthYear} onChange={e => props.onBirthYearChange(Number(e.target.value))}
                                    className="bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 font-bold focus-visible:ring-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pensione Età</Label>
                                <Input type="number" value={props.retirementAge} onChange={e => props.onRetirementAgeChange(Number(e.target.value))}
                                    className="bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 font-bold focus-visible:ring-blue-500" />
                            </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-slate-200">
                            <Label className="text-xs font-bold uppercase tracking-wider text-orange-600">Spesa Mensile nel FIRE (€)</Label>
                            <Input type="number" step="50" value={props.expectedMonthlyExpenses} onChange={e => props.onExpectedMonthlyExpensesChange(Number(e.target.value))}
                                className="bg-orange-50 border-orange-200 text-orange-700 font-extrabold text-lg focus-visible:ring-orange-500" />
                        </div>
                        <div className="space-y-2 pt-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Risparmio Mensile PAC (€)</Label>
                            <Input type="number" step="50" value={props.monthlySavings} onChange={e => props.onMonthlySavingsChange(Number(e.target.value))}
                                className="bg-blue-50 border-blue-200 text-blue-700 dark:text-blue-300 font-extrabold text-lg focus-visible:ring-blue-500" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Market Variables */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500">
                <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 pb-4 pt-6 px-6">
                    <CardTitle className="text-lg font-bold flex items-center text-slate-900 dark:text-slate-100">
                        <Activity className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" /> Variabili di Mercato
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-5">
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Safe Withdrawal Rate (%)</Label>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{props.fireWithdrawalRate.toFixed(2)}%</span>
                            </div>
                            <Slider value={[props.fireWithdrawalRate]} min={2} max={6} step={0.25} onValueChange={(val) => props.onFireWithdrawalRateChange(val[0])} />
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-200">
                            <div className="flex justify-between items-end">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inflazione Attesa (%)</Label>
                                <span className="font-bold text-amber-600 dark:text-amber-400">{props.expectedInflation.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.expectedInflation]} min={0} max={10} step={0.5} onValueChange={(val) => props.onExpectedInflationChange(val[0])} />
                            <p className="text-[10px] text-slate-500 leading-tight">L&apos;inflazione viene sottratta dal rendimento. Tutti i valori sono in euro odierni (potere d&apos;acquisto reale).</p>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-200">
                            <div className="flex justify-between items-end">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rendimento Medio Reale (%)</Label>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{props.fireExpectedReturn.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.fireExpectedReturn]} min={1} max={12} step={0.5} onValueChange={(val) => props.onFireExpectedReturnChange(val[0])} />
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-200">
                            <div className="flex justify-between items-end">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volatilità Attesa (%)</Label>
                                <span className="font-bold text-rose-600 dark:text-rose-400">{props.fireVolatility.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.fireVolatility]} min={5} max={30} step={0.5} onValueChange={(val) => props.onFireVolatilityChange(val[0])} />
                            <p className="text-[10px] text-slate-500 leading-tight">Storicamente un portafoglio 100% azionario globale ha una deviazione standard del 15%. Serve per i test di Monte Carlo.</p>
                        </div>

                        {/* Pension Optimizer */}
                        <div className="space-y-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Ottimizzazione TFR / Fondo Pensione</Label>
                                    <p className="text-[10px] text-slate-500 mt-1">Reinveste il rimborso IRPEF annuale sui tuoi versamenti.</p>
                                </div>
                                <button onClick={() => props.onEnablePensionOptimizerChange(!props.enablePensionOptimizer)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${props.enablePensionOptimizer ? 'bg-emerald-50 dark:bg-emerald-950/500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${props.enablePensionOptimizer ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {props.enablePensionOptimizer && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-white/70 dark:bg-slate-900/70 border border-slate-200 p-3 rounded-xl shadow-sm">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">RAL (€)</Label>
                                        <Input type="number" value={props.grossIncome} onChange={e => props.onGrossIncomeChange(Number(e.target.value))}
                                            className="h-8 text-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100 focus-visible:ring-emerald-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Versato (€)</Label>
                                        <Input type="number" value={props.pensionContribution} onChange={e => props.onPensionContributionChange(Number(e.target.value))}
                                            className="h-8 text-sm bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" max={5164} />
                                    </div>
                                    <div className="col-span-2 flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 px-3 py-2 rounded-lg mt-1 font-medium border border-emerald-100">
                                        <div className="flex flex-col">
                                            <span>Rimborso Annuo IRPEF 2024:</span>
                                            <span className="text-[9px] opacity-70">Reinvestito automaticamente a luglio nel calcolo FIRE.</span>
                                        </div>
                                        <span className="font-bold text-lg">+{formatEuro(props.annualTaxRefund)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tax & Public Pension */}
                        <div className="space-y-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Pensione INPS e Tasse</Label>
                                    <p className="text-[10px] text-slate-500 mt-1">Integra la previdenza pubblica e le tasse italiane.</p>
                                </div>
                            </div>
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-white/70 dark:bg-slate-900/70 border border-slate-200 p-3 rounded-xl shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div className="space-y-0.5">
                                        <Label className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase">Imposta di Bollo</Label>
                                        <p className="text-[9px] text-slate-500">0.2% annuo sulle attività finanziarie</p>
                                    </div>
                                    <Switch checked={props.applyTaxStamp} onCheckedChange={props.onApplyTaxStampChange} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Pensione INPS (€/m)</Label>
                                        <Input type="number" step="100" value={props.expectedPublicPension} onChange={e => props.onExpectedPublicPensionChange(Number(e.target.value))} className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase">Età Pensione</Label>
                                        <Input type="number" value={props.publicPensionAge} onChange={e => props.onPublicPensionAgeChange(Number(e.target.value))} className="h-8 text-sm" />
                                    </div>
                                </div>
                                <p className="text-[9px] text-blue-600 dark:text-blue-400 bg-blue-50 p-2 rounded-md leading-tight">
                                    La pensione pubblica ridurrà la necessità di prelievo dal tuo capitale dopo i {props.publicPensionAge} anni.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="text-center mt-6">
                        <span className="text-xs text-slate-500">I tuoi parametri vengono salvati automaticamente.</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});
