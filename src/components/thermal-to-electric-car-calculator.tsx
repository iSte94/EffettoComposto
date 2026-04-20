"use client";

import type { ReactNode } from "react";
import { memo, useMemo, useState } from "react";
import {
    ArrowRightLeft,
    BatteryCharging,
    CalendarRange,
    Car,
    ChevronDown,
    ChevronUp,
    Coins,
    CreditCard,
    Euro,
    Fuel,
    Gauge,
    Home,
    PiggyBank,
    Receipt,
    Scale,
    Shield,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Wallet,
    Wrench,
    Zap,
} from "lucide-react";
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatEuro, formatEuroCompact } from "@/lib/format";
import {
    compareThermalToElectricCar,
    TESLA_MODEL_3_LONG_RANGE_RWD_2026_CONSUMPTION_KWH_PER_100KM,
    type CurrentCarSaleMode,
    type ThermalToElectricCarInput,
} from "@/lib/finance/thermal-to-electric-car";

type Tone = "emerald" | "amber" | "rose" | "blue" | "teal";

interface MetricCardProps {
    title: string;
    value: string;
    caption: string;
    tone?: Tone;
}

interface NumberFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    icon?: ReactNode;
    min?: number;
    step?: number;
    suffix?: string;
    helper?: string;
}

interface TogglePillGroupProps<T extends string> {
    label: string;
    value: T;
    onChange: (value: T) => void;
    options: Array<{
        value: T;
        label: string;
        description: string;
    }>;
}

const toneStyles: Record<Tone, { wrap: string; title: string; value: string }> = {
    emerald: {
        wrap: "border-emerald-200 bg-emerald-50/90 dark:border-emerald-900 dark:bg-emerald-950/25",
        title: "text-emerald-500",
        value: "text-emerald-700 dark:text-emerald-300",
    },
    amber: {
        wrap: "border-amber-200 bg-amber-50/90 dark:border-amber-900 dark:bg-amber-950/25",
        title: "text-amber-500",
        value: "text-amber-700 dark:text-amber-300",
    },
    rose: {
        wrap: "border-rose-200 bg-rose-50/90 dark:border-rose-900 dark:bg-rose-950/25",
        title: "text-rose-500",
        value: "text-rose-700 dark:text-rose-300",
    },
    blue: {
        wrap: "border-blue-200 bg-blue-50/90 dark:border-blue-900 dark:bg-blue-950/25",
        title: "text-blue-500",
        value: "text-blue-700 dark:text-blue-300",
    },
    teal: {
        wrap: "border-teal-200 bg-teal-50/90 dark:border-teal-900 dark:bg-teal-950/25",
        title: "text-teal-500",
        value: "text-teal-700 dark:text-teal-300",
    },
};

const MetricCard = memo(function MetricCard({
    title,
    value,
    caption,
    tone = "blue",
}: MetricCardProps) {
    const style = toneStyles[tone];

    return (
        <div className={cn("rounded-3xl border p-4 shadow-sm backdrop-blur-xl", style.wrap)}>
            <p className={cn("text-[10px] font-bold uppercase tracking-widest", style.title)}>{title}</p>
            <p className={cn("mt-1 text-xl font-extrabold sm:text-2xl", style.value)}>{value}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{caption}</p>
        </div>
    );
});

const NumberField = memo(function NumberField({
    label,
    value,
    onChange,
    icon,
    min = 0,
    step = 1,
    suffix,
    helper,
}: NumberFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                {icon}
                <span>{label}</span>
            </Label>
            <div className="relative">
                <Input
                    type="number"
                    min={min}
                    step={step}
                    value={Number.isFinite(value) ? value : ""}
                    onChange={(event) => onChange(Math.max(min, Number(event.target.value) || 0))}
                    className="min-h-11 rounded-xl pr-24 text-sm"
                />
                {suffix && (
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground">
                        {suffix}
                    </span>
                )}
            </div>
            {helper && <p className="text-[11px] leading-relaxed text-muted-foreground">{helper}</p>}
        </div>
    );
});

function TogglePillGroup<T extends string>({
    label,
    value,
    onChange,
    options,
}: TogglePillGroupProps<T>) {
    return (
        <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
                {options.map((option) => {
                    const active = option.value === value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={cn(
                                "rounded-2xl border px-4 py-3 text-left transition-all",
                                active
                                    ? "border-teal-300 bg-teal-50 text-teal-800 shadow-sm dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200"
                                    : "border-border/70 bg-background/70 text-foreground hover:bg-muted/40",
                            )}
                        >
                            <div className="text-sm font-semibold">{option.label}</div>
                            <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{option.description}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function formatEuroDetailed(value: number): string {
    return `EUR ${value.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatSignedEuro(value: number): string {
    if (value === 0) return formatEuro(0);
    return `${value > 0 ? "+" : "-"}${formatEuro(Math.abs(value))}`;
}

function formatDecimal(value: number, decimals: number = 1): string {
    return value.toLocaleString("it-IT", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function formatYearsLabel(value: number | null, horizonYears: number): string {
    if (value === null) return "Mai";
    if (value <= 0) return "Subito";
    if (value > horizonYears) return `Oltre ${horizonYears} anni`;
    return `${formatDecimal(value, value < 10 ? 1 : 0)} anni`;
}

function formatKmLabel(value: number | null): string {
    if (value === null) return "Mai";
    if (value <= 0) return "Gia in pari";
    return `${Math.round(value).toLocaleString("it-IT")} km/anno`;
}

export function ThermalToElectricCarCalculator() {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saleMode, setSaleMode] = useState<CurrentCarSaleMode>("privateSale");
    const [evFinancingEnabled, setEvFinancingEnabled] = useState(false);

    const [horizonYears, setHorizonYears] = useState(6);
    const [annualKm, setAnnualKm] = useState(18000);

    const [thermalCurrentValue, setThermalCurrentValue] = useState(12000);
    const [thermalTradeInValueNow, setThermalTradeInValueNow] = useState(10200);
    const [thermalPrivateSaleCostsNow, setThermalPrivateSaleCostsNow] = useState(250);
    const [thermalFutureValue, setThermalFutureValue] = useState(4500);
    const [thermalConsumptionLitersPer100Km, setThermalConsumptionLitersPer100Km] = useState(6.8);
    const [fuelPricePerLiter, setFuelPricePerLiter] = useState(1.88);
    const [thermalInsurancePerYear, setThermalInsurancePerYear] = useState(820);
    const [thermalMaintenancePerYear, setThermalMaintenancePerYear] = useState(900);
    const [thermalTaxPerYear, setThermalTaxPerYear] = useState(280);
    const [thermalOtherFixedPerYear, setThermalOtherFixedPerYear] = useState(0);
    const [thermalOneOffCost, setThermalOneOffCost] = useState(0);

    const [evPurchasePrice, setEvPurchasePrice] = useState(42690);
    const [evPurchaseFeesOneOff, setEvPurchaseFeesOneOff] = useState(950);
    const [evHomeSetupCost, setEvHomeSetupCost] = useState(1800);
    const [evFutureValue, setEvFutureValue] = useState(22000);
    const [evConsumptionKwhPer100Km, setEvConsumptionKwhPer100Km] = useState(
        TESLA_MODEL_3_LONG_RANGE_RWD_2026_CONSUMPTION_KWH_PER_100KM,
    );
    const [homeChargingSharePct, setHomeChargingSharePct] = useState(70);
    const [homeElectricityPricePerKwh, setHomeElectricityPricePerKwh] = useState(0.24);
    const [publicChargingPricePerKwh, setPublicChargingPricePerKwh] = useState(0.65);
    const [evInsurancePerYear, setEvInsurancePerYear] = useState(920);
    const [evMaintenancePerYear, setEvMaintenancePerYear] = useState(350);
    const [evTaxPerYear, setEvTaxPerYear] = useState(0);
    const [evOtherFixedPerYear, setEvOtherFixedPerYear] = useState(0);
    const [evOneOffCost, setEvOneOffCost] = useState(400);
    const [evIncentives, setEvIncentives] = useState(0);

    const [evFinancingDownPayment, setEvFinancingDownPayment] = useState(5000);
    const [evFinancingAnnualRatePct, setEvFinancingAnnualRatePct] = useState(5.9);
    const [evFinancingYears, setEvFinancingYears] = useState(5);
    const [evFinancingFees, setEvFinancingFees] = useState(350);

    const [thermalRealWorldAdjustmentPct, setThermalRealWorldAdjustmentPct] = useState(0);
    const [evRealWorldAdjustmentPct, setEvRealWorldAdjustmentPct] = useState(0);
    const [chargingLossPct, setChargingLossPct] = useState(8);
    const [fuelCostGrowthPct, setFuelCostGrowthPct] = useState(2);
    const [electricityCostGrowthPct, setElectricityCostGrowthPct] = useState(2);
    const [thermalFixedCostGrowthPct, setThermalFixedCostGrowthPct] = useState(1.5);
    const [evFixedCostGrowthPct, setEvFixedCostGrowthPct] = useState(1.5);
    const [evAnnualBenefitsPerYear, setEvAnnualBenefitsPerYear] = useState(0);

    const comparisonInput = useMemo<ThermalToElectricCarInput>(
        () => ({
            horizonYears,
            annualKm,
            thermalCurrentValue,
            thermalTradeInValueNow,
            currentCarSaleMode: saleMode,
            thermalPrivateSaleCostsNow,
            thermalFutureValue,
            thermalConsumptionLitersPer100Km,
            thermalRealWorldAdjustmentPct,
            fuelPricePerLiter,
            fuelCostGrowthPct,
            thermalInsurancePerYear,
            thermalMaintenancePerYear,
            thermalTaxPerYear,
            thermalOtherFixedPerYear,
            thermalFixedCostGrowthPct,
            thermalOneOffCost,
            evPurchasePrice,
            evPurchaseFeesOneOff,
            evHomeSetupCost,
            evFutureValue,
            evConsumptionKwhPer100Km,
            evRealWorldAdjustmentPct,
            chargingLossPct,
            homeChargingSharePct,
            homeElectricityPricePerKwh,
            publicChargingPricePerKwh,
            electricityCostGrowthPct,
            evInsurancePerYear,
            evMaintenancePerYear,
            evTaxPerYear,
            evOtherFixedPerYear,
            evFixedCostGrowthPct,
            evOneOffCost,
            evIncentives,
            evAnnualBenefitsPerYear,
            evFinancingEnabled,
            evFinancingDownPayment,
            evFinancingAnnualRatePct,
            evFinancingYears,
            evFinancingFees,
        }),
        [
            annualKm,
            chargingLossPct,
            electricityCostGrowthPct,
            evAnnualBenefitsPerYear,
            evConsumptionKwhPer100Km,
            evFinancingAnnualRatePct,
            evFinancingDownPayment,
            evFinancingEnabled,
            evFinancingFees,
            evFinancingYears,
            evFixedCostGrowthPct,
            evFutureValue,
            evHomeSetupCost,
            evIncentives,
            evInsurancePerYear,
            evMaintenancePerYear,
            evOneOffCost,
            evOtherFixedPerYear,
            evPurchaseFeesOneOff,
            evPurchasePrice,
            evRealWorldAdjustmentPct,
            evTaxPerYear,
            fuelCostGrowthPct,
            fuelPricePerLiter,
            homeChargingSharePct,
            homeElectricityPricePerKwh,
            horizonYears,
            publicChargingPricePerKwh,
            saleMode,
            thermalConsumptionLitersPer100Km,
            thermalCurrentValue,
            thermalFixedCostGrowthPct,
            thermalFutureValue,
            thermalInsurancePerYear,
            thermalMaintenancePerYear,
            thermalOneOffCost,
            thermalOtherFixedPerYear,
            thermalPrivateSaleCostsNow,
            thermalRealWorldAdjustmentPct,
            thermalTaxPerYear,
            thermalTradeInValueNow,
        ],
    );

    const result = useMemo(
        () => compareThermalToElectricCar(comparisonInput),
        [comparisonInput],
    );

    const homeOnlyResult = useMemo(
        () => compareThermalToElectricCar({ ...comparisonInput, homeChargingSharePct: 100 }),
        [comparisonInput],
    );

    const publicOnlyResult = useMemo(
        () => compareThermalToElectricCar({ ...comparisonInput, homeChargingSharePct: 0 }),
        [comparisonInput],
    );

    const verdict = useMemo(() => {
        if (result.totalSavingsOverHorizon > 6000) {
            return {
                title: "Passaggio molto interessante",
                tone: "emerald" as Tone,
                text: `Sul periodo scelto la Tesla risulta avanti di circa ${formatEuro(result.totalSavingsOverHorizon)}.`,
            };
        }

        if (result.totalSavingsOverHorizon < -6000) {
            return {
                title: "Meglio tenere la termica",
                tone: "rose" as Tone,
                text: `Con queste ipotesi spenderesti circa ${formatEuro(Math.abs(result.totalSavingsOverHorizon))} in piu passando ora all&apos;elettrico.`,
            };
        }

        return {
            title: "Scenario molto tirato",
            tone: "amber" as Tone,
            text: "Il confronto e vicino: pochi parametri possono spostare il risultato in modo sensibile.",
        };
    }, [result.totalSavingsOverHorizon]);

    const verdictStyle = toneStyles[verdict.tone];

    const driverNotes = useMemo(() => {
        const notes: string[] = [];

        if (result.currentCarSaleMode === "tradeIn" && result.thermalTradeInDiscountVsPrivateSale > 0) {
            notes.push(
                `Con la permuta stai rinunciando a circa ${formatEuro(result.thermalTradeInDiscountVsPrivateSale)} rispetto al valore privato stimato oggi.`,
            );
        }

        if (result.breakEvenAnnualKm !== null && annualKm < result.breakEvenAnnualKm) {
            notes.push(
                `Con ${annualKm.toLocaleString("it-IT")} km/anno sei sotto la soglia di pareggio stimata di ${Math.round(
                    result.breakEvenAnnualKm,
                ).toLocaleString("it-IT")} km/anno.`,
            );
        }

        if (result.cashGapToday > 20000) {
            notes.push("Il nodo principale qui non e la gestione annua, ma il capitale che devi ancora mettere oggi per cambiare auto.");
        }

        if (result.evFinancingEnabled) {
            notes.push(
                `Con il finanziamento paghi circa ${formatEuro(result.evFinancingInterestWithinHorizon)} di interessi entro l&apos;orizzonte scelto.`,
            );
        }

        if (result.homeChargingSharePct < 50) {
            notes.push("La ricarica fuori casa pesa parecchio: se riesci a spostare piu ricariche a casa, il quadro migliora in fretta.");
        }

        if (notes.length === 0) {
            notes.push("Lo scenario e gia piuttosto equilibrato: per raffinarlo lavora soprattutto su svalutazione attesa, mix di ricarica e valore di vendita del tuo usato.");
        }

        return notes.slice(0, 4);
    }, [annualKm, result]);

    return (
        <div className="space-y-8 animate-in fade-in-50 duration-500">
            <div className="space-y-4 rounded-[2rem] border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-6 text-white shadow-xl shadow-slate-950/15">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            Da auto termica a elettrica
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                            Confronto completo: vendita usato, acquisto Tesla e finanziamento
                        </h2>
                        <p className="max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">
                            Qui il confronto e davvero completo: valore oggi del tuo usato, permuta vs vendita privata, prezzo della Tesla, pratiche,
                            wallbox, incentivi, costi di gestione, interessi del finanziamento e valore residuo finale.
                        </p>
                    </div>

                    <div className="grid min-w-[15rem] gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-100">Preset di base</p>
                            <p className="mt-1 text-xl font-extrabold text-white">Tesla Model 3 Long Range RWD</p>
                            <p className="mt-1 text-xs text-slate-300">
                                Consumo base ufficiale Tesla: {formatDecimal(TESLA_MODEL_3_LONG_RANGE_RWD_2026_CONSUMPTION_KWH_PER_100KM)} kWh/100 km.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-100">Modalita attiva</p>
                            <p className="mt-1 text-xl font-extrabold text-white">
                                {result.currentCarSaleMode === "privateSale" ? "Vendita privata" : "Permuta"}
                            </p>
                            <p className="mt-1 text-xs text-slate-300">
                                {result.evFinancingEnabled ? "Acquisto con finanziamento" : "Acquisto in cash"} • {result.horizonYears} anni
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={cn("rounded-[2rem] border p-5 shadow-md backdrop-blur-xl", verdictStyle.wrap)}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", verdictStyle.title)}>Sintesi decisione</p>
                        <h3 className={cn("text-2xl font-extrabold", verdictStyle.value)}>{verdict.title}</h3>
                        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{verdict.text}</p>
                    </div>
                    <div className="rounded-2xl border border-background/60 bg-background/65 px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vantaggio totale a {result.horizonYears} anni</p>
                        <p
                            className={cn(
                                "mt-1 text-3xl font-extrabold",
                                result.totalSavingsOverHorizon >= 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400",
                            )}
                        >
                            {formatSignedEuro(result.totalSavingsOverHorizon)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                    title="Ricavo netto usato oggi"
                    value={formatEuro(result.selectedCurrentCarSaleNetProceedsNow)}
                    caption={
                        result.currentCarSaleMode === "privateSale"
                            ? `Valore privato ${formatEuro(result.selectedCurrentCarSaleValueNow)} meno costi di vendita ${formatEuro(result.thermalPrivateSaleCostsNow)}.`
                            : `Permuta considerata oggi: ${formatEuro(result.selectedCurrentCarSaleNetProceedsNow)}.`
                    }
                    tone="teal"
                />
                <MetricCard
                    title="Costo economico del cambio"
                    value={formatSignedEuro(result.evEconomicSwitchCostToday)}
                    caption="Prezzo Tesla + pratiche + setup - incentivi - ricavo netto dell'usato. Non e il cash, e il salto economico netto."
                    tone={result.evEconomicSwitchCostToday >= 0 ? "amber" : "emerald"}
                />
                <MetricCard
                    title="Cash da mettere oggi"
                    value={result.cashGapToday > 0 ? formatEuro(result.cashGapToday) : "EUR 0"}
                    caption={
                        result.evFinancingEnabled
                            ? "Con finanziamento: anticipo cash + costi pratica finanziamento."
                            : "Acquisto cash al netto della vendita dell'usato e degli incentivi."
                    }
                    tone={result.cashGapToday > 0 ? "amber" : "teal"}
                />
                <MetricCard
                    title="Rivendita termica se la tieni"
                    value={formatEuro(thermalFutureValue)}
                    caption={`Valore stimato tra ${result.horizonYears} anni se non cambi auto.`}
                    tone="amber"
                />
                <MetricCard
                    title="Valore residuo Tesla"
                    value={formatEuro(evFutureValue)}
                    caption={`Valore stimato della Tesla tra ${result.horizonYears} anni.`}
                    tone="blue"
                />
                <MetricCard
                    title={result.evFinancingEnabled ? "Rata Tesla" : "Acquisto Tesla"}
                    value={
                        result.evFinancingEnabled
                            ? formatEuro(result.evFinancingMonthlyPayment)
                            : formatEuro(evPurchasePrice)
                    }
                    caption={
                        result.evFinancingEnabled
                            ? `Interessi entro orizzonte: ${formatEuro(result.evFinancingInterestWithinHorizon)}.`
                            : "Prezzo auto lordo prima degli incentivi, modificabile."
                    }
                    tone={result.evFinancingEnabled ? "rose" : "blue"}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-12">
                <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-md backdrop-blur-xl xl:col-span-3">
                    <CardContent className="space-y-5 p-5">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                                <Gauge className="h-5 w-5 text-teal-500" />
                                Utilizzo
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                Profili di chilometraggio, durata e mix di ricarica che muovono tutto il confronto.
                            </p>
                        </div>

                        <NumberField
                            label="Chilometri annui"
                            value={annualKm}
                            onChange={setAnnualKm}
                            icon={<Car className="h-3.5 w-3.5" />}
                            step={500}
                            suffix="km"
                        />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                    <CalendarRange className="h-3.5 w-3.5" />
                                    <span>Orizzonte di confronto</span>
                                </Label>
                                <span className="text-sm font-bold text-foreground">{horizonYears} anni</span>
                            </div>
                            <Slider value={[horizonYears]} min={1} max={12} step={1} onValueChange={(value) => setHorizonYears(value[0])} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                    <Home className="h-3.5 w-3.5" />
                                    <span>Quota di ricarica a casa</span>
                                </Label>
                                <span className="text-sm font-bold text-foreground">
                                    {result.homeChargingSharePct}% casa / {result.publicChargingSharePct}% fuori
                                </span>
                            </div>
                            <Slider value={[homeChargingSharePct]} min={0} max={100} step={5} onValueChange={(value) => setHomeChargingSharePct(value[0])} />
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                Il mix casa/colonnina e uno dei parametri che pesa di piu sulla convenienza reale.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-md backdrop-blur-xl xl:col-span-4">
                    <CardContent className="space-y-5 p-5">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                                <Fuel className="h-5 w-5 text-amber-500" />
                                Auto attuale: tenerla o venderla
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                Qui imposti sia il valore oggi del tuo usato, sia il valore futuro se decidi di tenerlo ancora.
                            </p>
                        </div>

                        <TogglePillGroup
                            label="Come realizzi l'usato oggi"
                            value={saleMode}
                            onChange={setSaleMode}
                            options={[
                                {
                                    value: "privateSale",
                                    label: "Vendita privata",
                                    description: "Massimizzi il ricavo ma consideri costi e tempo di vendita.",
                                },
                                {
                                    value: "tradeIn",
                                    label: "Permuta concessionario",
                                    description: "Piu semplice e veloce, ma spesso con valutazione piu bassa.",
                                },
                            ]}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <NumberField
                                label="Valore mercato / vendita privata"
                                value={thermalCurrentValue}
                                onChange={setThermalCurrentValue}
                                icon={<Wallet className="h-3.5 w-3.5" />}
                                step={500}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Valore in permuta oggi"
                                value={thermalTradeInValueNow}
                                onChange={setThermalTradeInValueNow}
                                icon={<Receipt className="h-3.5 w-3.5" />}
                                step={500}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Costi vendita privata"
                                value={thermalPrivateSaleCostsNow}
                                onChange={setThermalPrivateSaleCostsNow}
                                icon={<Coins className="h-3.5 w-3.5" />}
                                step={50}
                                suffix="EUR"
                                helper="Annunci, detailing, commissioni o margine di trattativa."
                            />
                            <NumberField
                                label={`Valore tra ${horizonYears} anni se la tieni`}
                                value={thermalFutureValue}
                                onChange={setThermalFutureValue}
                                icon={<TrendingDown className="h-3.5 w-3.5" />}
                                step={500}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Consumo medio"
                                value={thermalConsumptionLitersPer100Km}
                                onChange={setThermalConsumptionLitersPer100Km}
                                icon={<Gauge className="h-3.5 w-3.5" />}
                                step={0.1}
                                suffix="L/100"
                            />
                            <NumberField
                                label="Prezzo benzina"
                                value={fuelPricePerLiter}
                                onChange={setFuelPricePerLiter}
                                icon={<Euro className="h-3.5 w-3.5" />}
                                step={0.01}
                                suffix="EUR/L"
                            />
                            <NumberField
                                label="Assicurazione annua"
                                value={thermalInsurancePerYear}
                                onChange={setThermalInsurancePerYear}
                                icon={<Shield className="h-3.5 w-3.5" />}
                                step={50}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Manutenzione annua"
                                value={thermalMaintenancePerYear}
                                onChange={setThermalMaintenancePerYear}
                                icon={<Wrench className="h-3.5 w-3.5" />}
                                step={50}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Bollo annuo"
                                value={thermalTaxPerYear}
                                onChange={setThermalTaxPerYear}
                                icon={<Coins className="h-3.5 w-3.5" />}
                                step={25}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Altri fissi annui"
                                value={thermalOtherFixedPerYear}
                                onChange={setThermalOtherFixedPerYear}
                                icon={<PiggyBank className="h-3.5 w-3.5" />}
                                step={25}
                                suffix="EUR"
                            />
                        </div>

                        <NumberField
                            label="Spese extra se la tieni"
                            value={thermalOneOffCost}
                            onChange={setThermalOneOffCost}
                            icon={<TrendingUp className="h-3.5 w-3.5" />}
                            step={100}
                            suffix="EUR"
                            helper="Tagliandi importanti, gomme, batteria 12V, freni o lavori straordinari che prevedi nel periodo."
                        />
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-md backdrop-blur-xl xl:col-span-5">
                    <CardContent className="space-y-5 p-5">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                                <BatteryCharging className="h-5 w-5 text-teal-500" />
                                Tesla: acquisto, pratiche e gestione
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                Il blocco Tesla separa prezzo auto, costi iniziali, gestione annua e eventuale finanziamento.
                            </p>
                        </div>

                        <TogglePillGroup
                            label="Modalita di acquisto Tesla"
                            value={evFinancingEnabled ? "financing" : "cash"}
                            onChange={(mode) => setEvFinancingEnabled(mode === "financing")}
                            options={[
                                {
                                    value: "cash",
                                    label: "Acquisto cash",
                                    description: "Tutto il fabbisogno viene coperto subito con vendita usato, incentivi e liquidita personale.",
                                },
                                {
                                    value: "financing",
                                    label: "Acquisto con finanziamento",
                                    description: "Separi il costo economico dal cash iniziale e aggiungi interessi e pratiche finanziarie.",
                                },
                            ]}
                        />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <NumberField
                                label="Prezzo Tesla nuova"
                                value={evPurchasePrice}
                                onChange={setEvPurchasePrice}
                                icon={<Euro className="h-3.5 w-3.5" />}
                                step={500}
                                suffix="EUR"
                            />
                            <NumberField
                                label={`Valore tra ${horizonYears} anni`}
                                value={evFutureValue}
                                onChange={setEvFutureValue}
                                icon={<TrendingDown className="h-3.5 w-3.5" />}
                                step={500}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Pratiche e messa su strada"
                                value={evPurchaseFeesOneOff}
                                onChange={setEvPurchaseFeesOneOff}
                                icon={<Receipt className="h-3.5 w-3.5" />}
                                step={50}
                                suffix="EUR"
                                helper="Immatricolazione, IPT, messa su strada o spese documentali."
                            />
                            <NumberField
                                label="Wallbox e setup casa"
                                value={evHomeSetupCost}
                                onChange={setEvHomeSetupCost}
                                icon={<Home className="h-3.5 w-3.5" />}
                                step={100}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Altri costi iniziali EV"
                                value={evOneOffCost}
                                onChange={setEvOneOffCost}
                                icon={<Wallet className="h-3.5 w-3.5" />}
                                step={50}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Incentivi / bonus"
                                value={evIncentives}
                                onChange={setEvIncentives}
                                icon={<Sparkles className="h-3.5 w-3.5" />}
                                step={100}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Consumo base Tesla"
                                value={evConsumptionKwhPer100Km}
                                onChange={setEvConsumptionKwhPer100Km}
                                icon={<Zap className="h-3.5 w-3.5" />}
                                step={0.1}
                                suffix="kWh/100"
                                helper="Base ufficiale Tesla Italia: 13,6 kWh/100 km."
                            />
                            <NumberField
                                label="Ricarica a casa"
                                value={homeElectricityPricePerKwh}
                                onChange={setHomeElectricityPricePerKwh}
                                icon={<Home className="h-3.5 w-3.5" />}
                                step={0.01}
                                suffix="EUR/kWh"
                            />
                            <NumberField
                                label="Ricarica fuori casa"
                                value={publicChargingPricePerKwh}
                                onChange={setPublicChargingPricePerKwh}
                                icon={<Zap className="h-3.5 w-3.5" />}
                                step={0.01}
                                suffix="EUR/kWh"
                            />
                            <NumberField
                                label="Assicurazione annua"
                                value={evInsurancePerYear}
                                onChange={setEvInsurancePerYear}
                                icon={<Shield className="h-3.5 w-3.5" />}
                                step={50}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Manutenzione annua"
                                value={evMaintenancePerYear}
                                onChange={setEvMaintenancePerYear}
                                icon={<Wrench className="h-3.5 w-3.5" />}
                                step={25}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Bollo annuo"
                                value={evTaxPerYear}
                                onChange={setEvTaxPerYear}
                                icon={<Coins className="h-3.5 w-3.5" />}
                                step={25}
                                suffix="EUR"
                            />
                            <NumberField
                                label="Altri fissi annui"
                                value={evOtherFixedPerYear}
                                onChange={setEvOtherFixedPerYear}
                                icon={<PiggyBank className="h-3.5 w-3.5" />}
                                step={25}
                                suffix="EUR"
                            />
                        </div>

                        {evFinancingEnabled && (
                            <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/25 p-4">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-rose-500" />
                                    <h4 className="text-sm font-bold text-foreground">Finanziamento Tesla</h4>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <NumberField
                                        label="Anticipo cash"
                                        value={evFinancingDownPayment}
                                        onChange={setEvFinancingDownPayment}
                                        icon={<Wallet className="h-3.5 w-3.5" />}
                                        step={500}
                                        suffix="EUR"
                                        helper="Cash personale aggiuntivo oltre all'usato e agli incentivi."
                                    />
                                    <NumberField
                                        label="Spese pratica finanziamento"
                                        value={evFinancingFees}
                                        onChange={setEvFinancingFees}
                                        icon={<Receipt className="h-3.5 w-3.5" />}
                                        step={50}
                                        suffix="EUR"
                                    />
                                    <NumberField
                                        label="Tasso annuo"
                                        value={evFinancingAnnualRatePct}
                                        onChange={setEvFinancingAnnualRatePct}
                                        icon={<PercentIcon />}
                                        step={0.1}
                                        suffix="%"
                                    />
                                    <NumberField
                                        label="Durata finanziamento"
                                        value={evFinancingYears}
                                        onChange={(value) => setEvFinancingYears(Math.max(1, Math.round(value)))}
                                        icon={<CalendarRange className="h-3.5 w-3.5" />}
                                        step={1}
                                        suffix="anni"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <CardContent className="space-y-4 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Parametri avanzati per una stima piu precisa</h3>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                Qui puoi rendere il modello piu realistico: consumi reali, perdite di ricarica e crescita dei costi negli anni.
                            </p>
                        </div>
                        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setShowAdvanced((value) => !value)}>
                            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            {showAdvanced ? "Nascondi dettagli" : "Mostra dettagli"}
                        </Button>
                    </div>

                    {showAdvanced && (
                        <div className="grid gap-6 border-t border-border/70 pt-5 xl:grid-cols-3">
                            <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/25 p-4">
                                <h4 className="text-sm font-bold text-foreground">Consumi reali</h4>

                                <SliderField
                                    label="Scostamento termica vs dichiarato"
                                    value={thermalRealWorldAdjustmentPct}
                                    min={0}
                                    max={40}
                                    step={1}
                                    suffix="%"
                                    onChange={setThermalRealWorldAdjustmentPct}
                                />
                                <SliderField
                                    label="Scostamento EV vs ufficiale"
                                    value={evRealWorldAdjustmentPct}
                                    min={0}
                                    max={40}
                                    step={1}
                                    suffix="%"
                                    onChange={setEvRealWorldAdjustmentPct}
                                />
                                <SliderField
                                    label="Perdite di ricarica"
                                    value={chargingLossPct}
                                    min={0}
                                    max={20}
                                    step={1}
                                    suffix="%"
                                    onChange={setChargingLossPct}
                                />
                            </div>

                            <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/25 p-4">
                                <h4 className="text-sm font-bold text-foreground">Crescita prezzi nel tempo</h4>

                                <SliderField
                                    label="Crescita benzina annua"
                                    value={fuelCostGrowthPct}
                                    min={0}
                                    max={10}
                                    step={0.5}
                                    suffix="%"
                                    onChange={setFuelCostGrowthPct}
                                />
                                <SliderField
                                    label="Crescita elettricita annua"
                                    value={electricityCostGrowthPct}
                                    min={0}
                                    max={10}
                                    step={0.5}
                                    suffix="%"
                                    onChange={setElectricityCostGrowthPct}
                                />
                                <SliderField
                                    label="Crescita costi fissi termica"
                                    value={thermalFixedCostGrowthPct}
                                    min={0}
                                    max={10}
                                    step={0.5}
                                    suffix="%"
                                    onChange={setThermalFixedCostGrowthPct}
                                />
                                <SliderField
                                    label="Crescita costi fissi EV"
                                    value={evFixedCostGrowthPct}
                                    min={0}
                                    max={10}
                                    step={0.5}
                                    suffix="%"
                                    onChange={setEvFixedCostGrowthPct}
                                />
                            </div>

                            <div className="space-y-4 rounded-3xl border border-border/70 bg-muted/25 p-4">
                                <h4 className="text-sm font-bold text-foreground">Benefici annuali EV</h4>

                                <NumberField
                                    label="Benefici annui EV"
                                    value={evAnnualBenefitsPerYear}
                                    onChange={setEvAnnualBenefitsPerYear}
                                    icon={<Sparkles className="h-3.5 w-3.5" />}
                                    step={50}
                                    suffix="EUR"
                                    helper="Parcheggi, ZTL, Area C, rimborsi aziendali o altri vantaggi che abbassano il costo annuo."
                                />

                                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-xs leading-relaxed text-muted-foreground">
                                    <p className="font-semibold text-foreground">Suggerimento pratico</p>
                                    <p className="mt-1">
                                        Per uno scenario prudente alza il consumo EV reale, tieni perdite di ricarica sopra zero e non dare per certi incentivi o benefici urbani futuri.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
                <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur-xl">
                    <CardContent className="space-y-4 p-5">
                        <div className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-violet-500" />
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Operazione di cambio</h3>
                                <p className="text-xs text-muted-foreground">Quanto vale davvero vendere e comprare</p>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <MetricCard
                                title="Usato oggi"
                                value={formatEuro(result.selectedCurrentCarSaleNetProceedsNow)}
                                caption={
                                    result.currentCarSaleMode === "privateSale"
                                        ? `Netto dopo ${formatEuro(result.thermalPrivateSaleCostsNow)} di costi di vendita.`
                                        : "Valore netto da permuta applicato subito."
                                }
                                tone="teal"
                            />
                            <MetricCard
                                title="Pratiche e setup Tesla"
                                value={formatEuro(result.evPurchaseFeesOneOff + result.evHomeSetupCost + evOneOffCost)}
                                caption="Immatricolazione, messa su strada, wallbox e altri costi iniziali non recuperabili."
                                tone="amber"
                            />
                            <MetricCard
                                title="Salto economico netto"
                                value={formatSignedEuro(result.evEconomicSwitchCostToday)}
                                caption="Costo netto dell'operazione di passaggio oggi, indipendente dal modo in cui la finanzi."
                                tone={result.evEconomicSwitchCostToday >= 0 ? "amber" : "emerald"}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur-xl">
                    <CardContent className="space-y-4 p-5">
                        <div className="flex items-center gap-2">
                            <Fuel className="h-5 w-5 text-amber-500" />
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Fotografia termica</h3>
                                <p className="text-xs text-muted-foreground">Costo uso, fissi e svalutazione</p>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <MetricCard
                                title="Costo benzina primo anno"
                                value={formatEuro(result.thermalFuelCostPerYear)}
                                caption={`${formatEuroDetailed(result.thermalFuelCostPer100Km)} ogni 100 km con ${formatDecimal(result.effectiveThermalConsumptionLitersPer100Km)} L/100 km reali.`}
                                tone="amber"
                            />
                            <MetricCard
                                title="Gestione totale periodo"
                                value={formatEuro(result.thermalTotalOperatingCost)}
                                caption={`Media annua ${formatEuro(result.thermalAverageAnnualCost)} esclusa svalutazione.`}
                                tone="rose"
                            />
                            <MetricCard
                                title="Svalutazione termica"
                                value={formatEuro(result.thermalDepreciation)}
                                caption={`Da ${formatEuro(thermalCurrentValue)} a ${formatEuro(thermalFutureValue)} in ${result.horizonYears} anni.`}
                                tone="amber"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur-xl">
                    <CardContent className="space-y-4 p-5">
                        <div className="flex items-center gap-2">
                            <BatteryCharging className="h-5 w-5 text-teal-500" />
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Fotografia Tesla</h3>
                                <p className="text-xs text-muted-foreground">Energia, interessi e valore residuo</p>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <MetricCard
                                title="Ricarica primo anno"
                                value={formatEuro(result.evChargeCostPerYear)}
                                caption={`${formatEuroDetailed(result.evChargeCostPer100Km)} ogni 100 km con ${formatDecimal(result.evGridConsumptionKwhPer100Km)} kWh/100 km dal contatore.`}
                                tone="teal"
                            />
                            <MetricCard
                                title="Gestione totale periodo"
                                value={formatEuro(result.evTotalOperatingCost)}
                                caption={`Media annua ${formatEuro(result.evAverageAnnualCost)}. Benefici EV inclusi.`}
                                tone="blue"
                            />
                            <MetricCard
                                title={result.evFinancingEnabled ? "Interessi entro orizzonte" : "Svalutazione Tesla"}
                                value={
                                    result.evFinancingEnabled
                                        ? formatEuro(result.evFinancingInterestWithinHorizon)
                                        : formatEuro(result.evDepreciation - evIncentives)
                                }
                                caption={
                                    result.evFinancingEnabled
                                        ? `Debito residuo a fine periodo: ${formatEuro(result.evFinancingRemainingDebtAtHorizon)}.`
                                        : `Da ${formatEuro(evPurchasePrice)} a ${formatEuro(evFutureValue)} con incentivi pari a ${formatEuro(evIncentives)}.`
                                }
                                tone={result.evFinancingEnabled ? "rose" : "blue"}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
                <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur-xl">
                    <CardContent className="space-y-4 p-5">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <Sparkles className="h-4 w-4 text-violet-500" />
                            Leve che spostano davvero il risultato
                        </h3>
                        <div className="grid gap-3 md:grid-cols-2">
                            {driverNotes.map((note) => (
                                <div key={note} className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-xs leading-relaxed text-muted-foreground">
                                    {note}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-sm backdrop-blur-xl">
                    <CardContent className="space-y-4 p-5">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <InfoTooltip iconClassName="h-4 w-4 text-muted-foreground">
                                Il confronto economico usa TCO semplificato ma corretto: costi operativi, costi iniziali non recuperabili, interessi e differenza di svalutazione fra le due auto.
                            </InfoTooltip>
                            Assunzioni attive
                        </h3>
                        <div className="grid gap-3">
                            <MetricCard
                                title="Consumo termica reale"
                                value={`${formatDecimal(result.effectiveThermalConsumptionLitersPer100Km)} L/100`}
                                caption={`Scostamento reale impostato: ${formatDecimal(result.thermalRealWorldAdjustmentPct)}%.`}
                                tone="amber"
                            />
                            <MetricCard
                                title="Consumo EV dal contatore"
                                value={`${formatDecimal(result.evGridConsumptionKwhPer100Km)} kWh/100`}
                                caption={`Include ${formatDecimal(result.evRealWorldAdjustmentPct)}% di scostamento e ${formatDecimal(result.chargingLossPct)}% di perdite.`}
                                tone="teal"
                            />
                            <MetricCard
                                title="Crescita costi energia"
                                value={`${formatDecimal(result.fuelCostGrowthPct)}% / ${formatDecimal(result.electricityCostGrowthPct)}%`}
                                caption="Benzina / elettricita per ogni anno futuro del modello."
                                tone="blue"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <MetricCard
                    title="Risparmio operativo medio"
                    value={formatSignedEuro(result.averageAnnualRunningSavings)}
                    caption="Media annua dei costi correnti nel periodo, gia considerando crescita prezzi, benefici EV e interessi del finanziamento."
                    tone={result.averageAnnualRunningSavings >= 0 ? "emerald" : "rose"}
                />
                <MetricCard
                    title="Pareggio economico"
                    value={formatYearsLabel(result.economicBreakEvenYears, result.horizonYears)}
                    caption="Include gestione, pratiche, interessi e differenza di svalutazione."
                    tone="blue"
                />
                <MetricCard
                    title="Soglia km annui"
                    value={formatKmLabel(result.breakEvenAnnualKm)}
                    caption="Quanti km servono circa per portare il passaggio almeno in pari su questo orizzonte."
                    tone="teal"
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <MetricCard
                    title="Se carichi solo a casa"
                    value={formatSignedEuro(homeOnlyResult.totalSavingsOverHorizon)}
                    caption={`Costo energia medio ${formatEuroDetailed(homeOnlyResult.evChargeCostPer100Km)} ogni 100 km.`}
                    tone={homeOnlyResult.totalSavingsOverHorizon >= 0 ? "emerald" : "rose"}
                />
                <MetricCard
                    title="Se carichi solo fuori"
                    value={formatSignedEuro(publicOnlyResult.totalSavingsOverHorizon)}
                    caption={`Costo energia medio ${formatEuroDetailed(publicOnlyResult.evChargeCostPer100Km)} ogni 100 km.`}
                    tone={publicOnlyResult.totalSavingsOverHorizon >= 0 ? "emerald" : "rose"}
                />
            </div>

            <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <CardContent className="space-y-5 p-5">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Cumulato dei costi nel tempo</h3>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Le linee sommano gestione annua, costi iniziali non recuperabili, interessi del finanziamento e quota di svalutazione distribuita sugli anni.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Lettura veloce:</span> se la linea Tesla resta sotto, il passaggio e economicamente migliore.
                        </div>
                    </div>

                    <div className="h-[360px] md:h-[430px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={result.chartData} margin={{ top: 16, right: 20, left: 8, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                                    tickFormatter={(value: number) => formatEuroCompact(value)}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "16px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "var(--popover)",
                                        color: "var(--popover-foreground)",
                                        boxShadow: "0 20px 45px -20px rgba(15, 23, 42, 0.45)",
                                    }}
                                    formatter={(value: number | string | undefined, name) => {
                                        const label =
                                            name === "thermalCumulativeCost"
                                                ? "Tenere la termica"
                                                : name === "evCumulativeCost"
                                                ? "Passare alla Tesla"
                                                : "Vantaggio Tesla";
                                        return [formatEuro(Number(value ?? 0)), label];
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: "12px", color: "var(--muted-foreground)", paddingTop: "8px" }}
                                    formatter={(value) =>
                                        value === "thermalCumulativeCost"
                                            ? "Tenere la termica"
                                            : value === "evCumulativeCost"
                                            ? "Passare alla Tesla"
                                            : "Vantaggio Tesla"
                                    }
                                />
                                <Line type="monotone" dataKey="thermalCumulativeCost" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="evCumulativeCost" stroke="#14b8a6" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                                <Line type="monotone" dataKey="advantage" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="6 6" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-[2rem] border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <CardContent className="space-y-4 p-5">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Anno per anno</h3>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                La tabella rende esplicito l&apos;effetto di energia, costi fissi, interessi e debito residuo sul risultato finale.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-xs text-muted-foreground">
                            Costo medio all-in: {formatEuroDetailed(result.allInThermalCostPerKm)} / {formatEuroDetailed(result.allInEvCostPerKm)} per km
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Anno</TableHead>
                                <TableHead>Benzina</TableHead>
                                <TableHead>Casa / fuori</TableHead>
                                <TableHead>Termica annua</TableHead>
                                <TableHead>Tesla annua</TableHead>
                                <TableHead>Interessi</TableHead>
                                <TableHead>Debito residuo</TableHead>
                                <TableHead>Risparmio annuo</TableHead>
                                <TableHead>Vantaggio cumulato</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.yearlyBreakdown.map((row) => (
                                <TableRow key={row.year}>
                                    <TableCell className="font-semibold text-foreground">{row.label}</TableCell>
                                    <TableCell>{formatEuroDetailed(row.fuelPricePerLiter)}</TableCell>
                                    <TableCell>
                                        {formatEuroDetailed(row.homeElectricityPricePerKwh)} / {formatEuroDetailed(row.publicElectricityPricePerKwh)}
                                    </TableCell>
                                    <TableCell>{formatEuro(row.thermalAnnualCost)}</TableCell>
                                    <TableCell>{formatEuro(row.evAnnualCost)}</TableCell>
                                    <TableCell>{formatEuro(row.evFinancingInterest)}</TableCell>
                                    <TableCell>{formatEuro(row.evRemainingDebtEndOfYear)}</TableCell>
                                    <TableCell
                                        className={cn(
                                            "font-semibold",
                                            row.annualRunningSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                                        )}
                                    >
                                        {formatSignedEuro(row.annualRunningSavings)}
                                    </TableCell>
                                    <TableCell
                                        className={cn(
                                            "font-semibold",
                                            row.cumulativeSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                                        )}
                                    >
                                        {formatSignedEuro(row.cumulativeSavings)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function SliderField({
    label,
    value,
    min,
    max,
    step,
    suffix,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    suffix: string;
    onChange: (value: number) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
                <span className="text-sm font-bold text-foreground">
                    {formatDecimal(value, step < 1 ? 1 : 0)}
                    {suffix}
                </span>
            </div>
            <Slider value={[value]} min={min} max={max} step={step} onValueChange={(values) => onChange(values[0])} />
        </div>
    );
}

function PercentIcon() {
    return <span className="text-xs font-bold text-muted-foreground">%</span>;
}
