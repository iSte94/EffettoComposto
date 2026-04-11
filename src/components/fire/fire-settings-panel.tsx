"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Target, Activity } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/info-tooltip";

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
    pensionFundAccessAge: number;
    pensionFundExitTaxRate: number;
    pensionExitMode: "annuity" | "hybrid";
    employerContributionType: "percent" | "fixed";
    employerContributionValue: number;
    tfrContribution: number;
    employerContribution: number;
    totalAnnualPensionContribution: number;
    calculatedPensionAnnuity: number;
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
    onPensionFundAccessAgeChange: (v: number) => void;
    onPensionFundExitTaxRateChange: (v: number) => void;
    onPensionExitModeChange: (v: "annuity" | "hybrid") => void;
    onEmployerContributionTypeChange: (v: "percent" | "fixed") => void;
    onEmployerContributionValueChange: (v: number) => void;
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
                                <div className="flex items-center gap-1">
                                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">Includi Immobili</Label>
                                    <InfoTooltip>Se attivo, il valore degli immobili viene incluso nel capitale per il calcolo FIRE. Disattiva se consideri gli immobili non liquidabili.</InfoTooltip>
                                </div>
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
                                <div className="flex items-center gap-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Safe Withdrawal Rate (%)</Label>
                                    <InfoTooltip>Percentuale del patrimonio che puoi prelevare ogni anno senza esaurirlo. La regola del 4% e&#768; la piu&#768; nota, ma valori piu&#768; bassi (3-3.5%) offrono maggiore sicurezza su orizzonti lunghi.</InfoTooltip>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{props.fireWithdrawalRate.toFixed(2)}%</span>
                            </div>
                            <Slider value={[props.fireWithdrawalRate]} min={2} max={6} step={0.25} onValueChange={(val) => props.onFireWithdrawalRateChange(val[0])} />
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex items-center gap-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Inflazione Attesa (%)</Label>
                                    <InfoTooltip>L&apos;inflazione viene sottratta dal rendimento nominale. Tutti i valori FIRE sono espressi in euro odierni (potere d&apos;acquisto reale).</InfoTooltip>
                                </div>
                                <span className="font-bold text-amber-600 dark:text-amber-400">{props.expectedInflation.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.expectedInflation]} min={0} max={10} step={0.5} onValueChange={(val) => props.onExpectedInflationChange(val[0])} />
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex items-center gap-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Rendimento Medio Reale (%)</Label>
                                    <InfoTooltip>Rendimento annuo nominale atteso del tuo portafoglio. Viene usato anche nella proiezione patrimonio con interesse composto dalla pagina Riepilogo.</InfoTooltip>
                                </div>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{props.fireExpectedReturn.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.fireExpectedReturn]} min={1} max={12} step={0.5} onValueChange={(val) => props.onFireExpectedReturnChange(val[0])} />
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex items-center gap-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Volatilita Attesa (%)</Label>
                                    <InfoTooltip>Deviazione standard annua del portafoglio. Un portafoglio 100% azionario globale ha storicamente ~15%. Serve per le simulazioni Monte Carlo.</InfoTooltip>
                                </div>
                                <span className="font-bold text-rose-600 dark:text-rose-400">{props.fireVolatility.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.fireVolatility]} min={5} max={30} step={0.5} onValueChange={(val) => props.onFireVolatilityChange(val[0])} />
                        </div>

                        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-1">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Ottimizzazione TFR / Fondo Pensione</Label>
                                        <InfoTooltip>Simula il fondo pensione complementare: TFR, contributi volontari e datoriali. Il rimborso IRPEF annuale viene reinvestito automaticamente nel calcolo FIRE.</InfoTooltip>
                                    </div>
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
                                <div className="space-y-4 rounded-xl border border-slate-200 bg-white/75 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">RAL (€)</Label>
                                            <Input type="number" value={props.grossIncome} onChange={e => props.onGrossIncomeChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Versato Volontario (€/anno)</Label>
                                            <Input type="number" value={props.pensionContribution} onChange={e => props.onPensionContributionChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" max={5164} />
                                        </div>
                                    </div>

                                    {/* Contributo Datore di Lavoro */}
                                    <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label className="text-[10px] font-bold uppercase text-slate-900 dark:text-slate-100">Contributo Datore di Lavoro</Label>
                                            <div className="flex rounded-full border border-slate-200 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-800">
                                                <button
                                                    onClick={() => props.onEmployerContributionTypeChange("percent")}
                                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${props.employerContributionType === "percent" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
                                                >% RAL</button>
                                                <button
                                                    onClick={() => props.onEmployerContributionTypeChange("fixed")}
                                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${props.employerContributionType === "fixed" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
                                                >€ Fisso</button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                step={props.employerContributionType === "percent" ? "0.1" : "100"}
                                                value={props.employerContributionValue}
                                                onChange={e => props.onEmployerContributionValueChange(Number(e.target.value))}
                                                className="h-9 border-slate-200 bg-white/80 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                                            />
                                            <span className="whitespace-nowrap text-[10px] text-slate-500">= {formatEuro(props.employerContribution)}/anno</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Eta Accesso FP (RITA)</Label>
                                            <Input type="number" value={props.pensionFundAccessAge} onChange={e => props.onPensionFundAccessAgeChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" min={50} max={100} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Tassazione Uscita FP (%)</Label>
                                            <InfoTooltip>Aliquota agevolata: parte dal 15% e scende dello 0.3% per ogni anno di partecipazione oltre il 15°, fino a un minimo del 9%.</InfoTooltip>
                                        </div>
                                            <div className="flex items-center gap-3">
                                                <Slider value={[props.pensionFundExitTaxRate]} min={9} max={15} step={0.3} onValueChange={(val) => props.onPensionFundExitTaxRateChange(val[0])} className="flex-1" />
                                                <span className="min-w-[40px] text-right text-sm font-bold text-slate-900 dark:text-slate-100">{props.pensionFundExitTaxRate.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modalita Uscita FP */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Modalita Uscita</Label>
                                            <InfoTooltip>Come ricevere il fondo pensione: 50/50 (max consentito dalla legge, meta&#768; subito e meta&#768; come rendita mensile) oppure 100% rendita (piu&#768; conservativo e stabile).</InfoTooltip>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => props.onPensionExitModeChange("hybrid")}
                                                className={`rounded-xl border p-2.5 text-left transition-all ${props.pensionExitMode === "hybrid"
                                                    ? "border-blue-400 bg-blue-50 shadow-sm dark:border-blue-600 dark:bg-blue-950/40"
                                                    : "border-slate-200 bg-white/60 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-slate-600"}`}
                                            >
                                                <span className={`block text-xs font-bold ${props.pensionExitMode === "hybrid" ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`}>50% Capitale + 50% Rendita</span>
                                            </button>
                                            <button
                                                onClick={() => props.onPensionExitModeChange("annuity")}
                                                className={`rounded-xl border p-2.5 text-left transition-all ${props.pensionExitMode === "annuity"
                                                    ? "border-blue-400 bg-blue-50 shadow-sm dark:border-blue-600 dark:bg-blue-950/40"
                                                    : "border-slate-200 bg-white/60 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-slate-600"}`}
                                            >
                                                <span className={`block text-xs font-bold ${props.pensionExitMode === "annuity" ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`}>100% Rendita</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2 flex flex-col gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex flex-col">
                                            <span>Rimborso Annuo IRPEF 2024:</span>
                                            <span className="text-[9px] opacity-70">Reinvestito automaticamente a luglio nel calcolo FIRE.</span>
                                        </div>
                                        <span className="text-lg font-bold">+{formatEuro(props.annualTaxRefund)}</span>
                                    </div>

                                    <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/30">
                                        <div className="space-y-1 text-xs text-blue-800 dark:text-blue-300">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-blue-600/80 dark:text-blue-400/60">Volontario</span>
                                                <span className="font-medium">{formatEuro(Math.min(props.pensionContribution, 5164.57))}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-blue-600/80 dark:text-blue-400/60">TFR (~6.91% RAL)</span>
                                                <span className="font-medium">{formatEuro(props.tfrContribution)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-blue-600/80 dark:text-blue-400/60">Datore di lavoro</span>
                                                <span className="font-medium">{formatEuro(props.employerContribution)}</span>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-blue-200 pt-1 dark:border-blue-800">
                                                <span className="font-bold">Totale FP/anno</span>
                                                <span className="font-bold">{formatEuro(props.totalAnnualPensionContribution)}</span>
                                            </div>
                                        </div>
                                        {props.calculatedPensionAnnuity > 0 && (
                                            <div className="mt-2 flex items-center justify-between border-t border-blue-200 pt-1.5 text-xs text-blue-800 dark:border-blue-800 dark:text-blue-300">
                                                <span className="font-medium">Rendita FP stimata:</span>
                                                <span className="font-bold">{formatEuro(props.calculatedPensionAnnuity)}/mese</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-1">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Pensione INPS e Tasse</Label>
                                        <InfoTooltip>Integra la previdenza pubblica e le tasse italiane. La pensione INPS ridurra&#768; la necessita&#768; di prelievo dal capitale dopo l&apos;eta&#768; pensionabile.</InfoTooltip>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 rounded-xl border border-slate-200 bg-white/75 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <Label className="text-[10px] font-bold uppercase text-slate-900 dark:text-slate-100">Imposta di Bollo</Label>
                                            <InfoTooltip>Tassa dello 0.2% annuo sul valore delle attivita&#768; finanziarie (conti deposito, ETF, azioni). Se attivo, viene sottratta dal rendimento nel calcolo FIRE.</InfoTooltip>
                                        </div>
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
