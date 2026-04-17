"use client";

import { memo } from "react";
import { Activity, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatEuro } from "@/lib/format";
import type { AssetOwner, PensionConfig, PensionContributionMode } from "@/types";
import type { PensionBreakdownSummary } from "@/lib/finance/pension-optimizer";

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
    pensionConfig: PensionConfig;
    pensionSummary: PensionBreakdownSummary;
    calculatedPensionAnnuity: number;
    pensionFundAccessAge: number;
    pensionFundExitTaxRate: number;
    pensionExitMode: "annuity" | "hybrid";
    applyTaxStamp: boolean;
    expectedPublicPension: number;
    publicPensionAge: number;
    person1Name: string;
    person2Name: string;
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
    onPensionConfigChange: (config: PensionConfig) => void;
    onPensionFundAccessAgeChange: (v: number) => void;
    onPensionFundExitTaxRateChange: (v: number) => void;
    onPensionExitModeChange: (v: "annuity" | "hybrid") => void;
    onApplyTaxStampChange: (v: boolean) => void;
    onExpectedPublicPensionChange: (v: number) => void;
    onPublicPensionAgeChange: (v: number) => void;
}

function updateContributionMode(
    props: FireSettingsPanelProps,
    personKey: AssetOwner,
    bucket: "voluntaryContribution" | "employerContribution",
    mode: PensionContributionMode,
) {
    props.onPensionConfigChange({
        ...props.pensionConfig,
        [personKey]: {
            ...props.pensionConfig[personKey],
            [bucket]: {
                ...props.pensionConfig[personKey][bucket],
                mode,
            },
        },
    });
}

function updateContributionValue(
    props: FireSettingsPanelProps,
    personKey: AssetOwner,
    bucket: "voluntaryContribution" | "employerContribution",
    value: number,
) {
    props.onPensionConfigChange({
        ...props.pensionConfig,
        [personKey]: {
            ...props.pensionConfig[personKey],
            [bucket]: {
                ...props.pensionConfig[personKey][bucket],
                value,
            },
        },
    });
}

function updatePersonField(
    props: FireSettingsPanelProps,
    personKey: AssetOwner,
    field: "active" | "grossAnnualSalary",
    value: boolean | number,
) {
    props.onPensionConfigChange({
        ...props.pensionConfig,
        [personKey]: {
            ...props.pensionConfig[personKey],
            [field]: value,
        },
    });
}

export const FireSettingsPanel = memo(function FireSettingsPanel(props: FireSettingsPanelProps) {
    const renderPersonCard = (personKey: AssetOwner, label: string, accentClass: string) => {
        const config = props.pensionConfig[personKey];
        const breakdown = props.pensionSummary.byPerson[personKey];

        return (
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <div className={`text-xs font-bold uppercase tracking-widest ${accentClass}`}>{label}</div>
                        <div className="text-sm text-slate-500">Configura contributi volontari, datore e RAL annua.</div>
                    </div>
                    <Switch
                        checked={config.active}
                        onCheckedChange={(checked) => updatePersonField(props, personKey, "active", checked)}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">RAL annua (€)</Label>
                        <Input
                            type="number"
                            min={0}
                            value={config.grossAnnualSalary}
                            onChange={(e) => updatePersonField(props, personKey, "grossAnnualSalary", Number(e.target.value))}
                            className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contributo volontario</Label>
                        <div className="flex gap-2">
                            <Select
                                value={config.voluntaryContribution.mode}
                                onValueChange={(value: PensionContributionMode) => updateContributionMode(props, personKey, "voluntaryContribution", value)}
                            >
                                <SelectTrigger className="h-11 w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percent">% stipendio</SelectItem>
                                    <SelectItem value="fixed">€ fissi</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                min={0}
                                step={config.voluntaryContribution.mode === "percent" ? 0.1 : 100}
                                value={config.voluntaryContribution.value}
                                onChange={(e) => updateContributionValue(props, personKey, "voluntaryContribution", Number(e.target.value))}
                                className="h-11"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contributo datore di lavoro</Label>
                        <div className="flex gap-2">
                            <Select
                                value={config.employerContribution.mode}
                                onValueChange={(value: PensionContributionMode) => updateContributionMode(props, personKey, "employerContribution", value)}
                            >
                                <SelectTrigger className="h-11 w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percent">% RAL</SelectItem>
                                    <SelectItem value="fixed">€ fissi</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                min={0}
                                step={config.employerContribution.mode === "percent" ? 0.1 : 100}
                                value={config.employerContribution.value}
                                onChange={(e) => updateContributionValue(props, personKey, "employerContribution", Number(e.target.value))}
                                className="h-11"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-xs dark:border-blue-900 dark:bg-blue-950/30">
                    <div className="flex items-center justify-between"><span>Volontario annuo</span><span className="font-bold">{formatEuro(breakdown.voluntaryAmount)}</span></div>
                    <div className="mt-1 flex items-center justify-between"><span>Datore annuo</span><span className="font-bold">{formatEuro(breakdown.employerAmount)}</span></div>
                    <div className="mt-1 flex items-center justify-between"><span>TFR annuo</span><span className="font-bold">{formatEuro(breakdown.tfrAmount)}</span></div>
                    <div className="mt-1 flex items-center justify-between"><span>Rimborso IRPEF</span><span className="font-bold text-emerald-700 dark:text-emerald-300">+{formatEuro(breakdown.annualTaxRefund)}</span></div>
                    <div className="mt-2 flex items-center justify-between border-t border-blue-200 pt-2 font-bold dark:border-blue-800"><span>Totale fondo/anno</span><span>{formatEuro(breakdown.totalAnnualContribution)}</span></div>
                </div>
            </div>
        );
    };

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
                                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">Includi Asset Extra</Label>
                                    <InfoTooltip>Se attivo, il capitale FIRE include anche safe haven e fondo pensione gia&apos; accumulato. Il valore degli immobili non entra mai nel FIRE: contano solo le rendite nette future.</InfoTooltip>
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
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pensione età</Label>
                                <Input type="number" value={props.retirementAge} onChange={e => props.onRetirementAgeChange(Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100" />
                            </div>
                        </div>

                        <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <Label className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Spesa mensile nel FIRE (€)</Label>
                            <Input type="number" step="50" value={props.expectedMonthlyExpenses} onChange={e => props.onExpectedMonthlyExpensesChange(Number(e.target.value))} className="h-11 border-orange-200 bg-orange-50 font-extrabold text-lg text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-1">
                                <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">PAC mensile extra al fondo pensione (€)</Label>
                                <InfoTooltip>Questo importo rappresenta solo il capitale che aggiungi al portafoglio investibile. I contributi al fondo pensione seguono un canale separato qui sotto.</InfoTooltip>
                            </div>
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
                                    <InfoTooltip>Percentuale del patrimonio che puoi prelevare ogni anno senza esaurirlo. La regola del 4% è la più nota, ma valori più bassi offrono più sicurezza su orizzonti lunghi.</InfoTooltip>
                                </div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{props.fireWithdrawalRate.toFixed(2)}%</span>
                            </div>
                            <Slider value={[props.fireWithdrawalRate]} min={2} max={6} step={0.25} onValueChange={(val) => props.onFireWithdrawalRateChange(val[0])} />
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex items-center gap-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Inflazione attesa (%)</Label>
                                    <InfoTooltip>L&apos;inflazione viene sottratta dal rendimento nominale. Tutti i valori FIRE sono espressi in euro odierni.</InfoTooltip>
                                </div>
                                <span className="font-bold text-amber-600 dark:text-amber-400">{props.expectedInflation.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.expectedInflation]} min={0} max={10} step={0.5} onValueChange={(val) => props.onExpectedInflationChange(val[0])} />
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex items-center gap-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Rendimento medio reale (%)</Label>
                                    <InfoTooltip>Rendimento annuo reale atteso del portafoglio investibile.</InfoTooltip>
                                </div>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{props.fireExpectedReturn.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.fireExpectedReturn]} min={1} max={12} step={0.5} onValueChange={(val) => props.onFireExpectedReturnChange(val[0])} />
                        </div>

                        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex items-center gap-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Volatilità attesa (%)</Label>
                                    <InfoTooltip>Serve alle simulazioni Monte Carlo.</InfoTooltip>
                                </div>
                                <span className="font-bold text-rose-600 dark:text-rose-400">{props.fireVolatility.toFixed(1)}%</span>
                            </div>
                            <Slider value={[props.fireVolatility]} min={5} max={30} step={0.5} onValueChange={(val) => props.onFireVolatilityChange(val[0])} />
                        </div>

                        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Fondo pensione strutturato</Label>
                                    <InfoTooltip>Configura separatamente le due persone. Il rimborso IRPEF rientra nel portafoglio FIRE, mentre i contributi alimentano il fondo pensione.</InfoTooltip>
                                </div>
                                <Switch checked={props.enablePensionOptimizer} onCheckedChange={props.onEnablePensionOptimizerChange} />
                            </div>

                            {props.enablePensionOptimizer && (
                                <div className="space-y-4 rounded-xl border border-slate-200 bg-white/75 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                                    <div className="grid grid-cols-1 gap-4">
                                        {renderPersonCard("person1", props.person1Name, "text-blue-600 dark:text-blue-400")}
                                        {renderPersonCard("person2", props.person2Name, "text-violet-600 dark:text-violet-400")}
                                    </div>

                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4 text-xs dark:border-emerald-900 dark:bg-emerald-950/40">
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            <div><div className="text-[10px] uppercase text-emerald-700/70">Volontario</div><div className="font-bold">{formatEuro(props.pensionSummary.totalVoluntary)}</div></div>
                                            <div><div className="text-[10px] uppercase text-emerald-700/70">Datore</div><div className="font-bold">{formatEuro(props.pensionSummary.totalEmployer)}</div></div>
                                            <div><div className="text-[10px] uppercase text-emerald-700/70">TFR</div><div className="font-bold">{formatEuro(props.pensionSummary.totalTfr)}</div></div>
                                            <div><div className="text-[10px] uppercase text-emerald-700/70">Rimborso IRPEF</div><div className="font-bold">+{formatEuro(props.pensionSummary.annualTaxRefund)}</div></div>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between border-t border-emerald-200 pt-3 font-bold dark:border-emerald-800">
                                            <span>Totale fondo pensione / anno</span>
                                            <span>{formatEuro(props.pensionSummary.totalAnnualContribution)}</span>
                                        </div>
                                        {props.calculatedPensionAnnuity > 0 && (
                                            <div className="mt-2 flex items-center justify-between font-medium">
                                                <span>Rendita stimata dopo l’accesso</span>
                                                <span>{formatEuro(props.calculatedPensionAnnuity)}/mese</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Età accesso fondo</Label>
                                            <Input type="number" value={props.pensionFundAccessAge} onChange={e => props.onPensionFundAccessAgeChange(Number(e.target.value))} className="h-11" min={50} max={100} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1">
                                                <Label className="text-[10px] font-bold uppercase text-slate-500">Tassazione uscita fondo (%)</Label>
                                                <InfoTooltip>Aliquota agevolata tra 9% e 15%.</InfoTooltip>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Slider value={[props.pensionFundExitTaxRate]} min={9} max={15} step={0.3} onValueChange={(val) => props.onPensionFundExitTaxRateChange(val[0])} className="flex-1" />
                                                <span className="min-w-[40px] text-right text-sm font-bold text-slate-900 dark:text-slate-100">{props.pensionFundExitTaxRate.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Modalità uscita</Label>
                                            <InfoTooltip>Capitale + rendita oppure solo rendita.</InfoTooltip>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => props.onPensionExitModeChange("hybrid")}
                                                className={`rounded-xl border p-2.5 text-left transition-all ${props.pensionExitMode === "hybrid"
                                                    ? "border-blue-400 bg-blue-50 shadow-sm dark:border-blue-600 dark:bg-blue-950/40"
                                                    : "border-slate-200 bg-white/60 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-slate-600"}`}
                                            >
                                                <span className={`block text-xs font-bold ${props.pensionExitMode === "hybrid" ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`}>50% capitale + 50% rendita</span>
                                            </button>
                                            <button
                                                onClick={() => props.onPensionExitModeChange("annuity")}
                                                className={`rounded-xl border p-2.5 text-left transition-all ${props.pensionExitMode === "annuity"
                                                    ? "border-blue-400 bg-blue-50 shadow-sm dark:border-blue-600 dark:bg-blue-950/40"
                                                    : "border-slate-200 bg-white/60 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-slate-600"}`}
                                            >
                                                <span className={`block text-xs font-bold ${props.pensionExitMode === "annuity" ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`}>100% rendita</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <div className="space-y-4 rounded-xl border border-slate-200 bg-white/75 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1">
                                            <Label className="text-[10px] font-bold uppercase text-slate-900 dark:text-slate-100">Imposta di bollo</Label>
                                            <InfoTooltip>Tassa dello 0.2% annuo sulle attività finanziarie soggette a bollo.</InfoTooltip>
                                        </div>
                                    </div>
                                    <Switch checked={props.applyTaxStamp} onCheckedChange={props.onApplyTaxStampChange} />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Pensione INPS (€ / mese)</Label>
                                        <Input type="number" step="100" value={props.expectedPublicPension} onChange={e => props.onExpectedPublicPensionChange(Number(e.target.value))} className="h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Età pensione pubblica</Label>
                                        <Input type="number" value={props.publicPensionAge} onChange={e => props.onPublicPensionAgeChange(Number(e.target.value))} className="h-11" />
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
