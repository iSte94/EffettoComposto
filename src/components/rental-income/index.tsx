"use client";

import { useState, useMemo, memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Home, TrendingUp, BarChart3, Sparkles,
    BedDouble, CalendarClock, Building2, ArrowRightLeft,
    Percent, ShieldCheck, Brush, Wifi, Users, Receipt,
    Save, FolderOpen, Trash2, Download, Upload,
} from "lucide-react";
import { formatEuro, formatPercent } from "@/lib/format";

// ── Tipi ────────────────────────────────────────────────────────────────

interface PropertyInputs {
    propertyValue: number;
    imuAnnual: number;
    condominiumMonthly: number;
    insuranceAnnual: number;
    maintenanceAnnual: number;
    propertyManagerPercent: number;
    usePropertyManager: boolean;
}

interface ShortTermInputs {
    nightlyRate: number;
    cleaningCostPerStay: number;
    platformFeePercent: number;
    laundryConsumablesPerStay: number;
    utilitiesMonthly: number;
    touristTaxPerNight: number;
    averageStayNights: number;
    isSecondProperty: boolean;
}

interface MonthScheduleEntry {
    rent: number;
    occupied: boolean;
}

const MONTH_LABELS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function createDefaultSchedule(rent: number): MonthScheduleEntry[] {
    return Array.from({ length: 12 }, () => ({ rent, occupied: true }));
}

interface TransitionalInputs {
    monthlySchedule: MonthScheduleEntry[];
    utilitiesIncluded: boolean;
    utilitiesMonthly: number;
    agencyFeeMonths: number;
    furnishingAmortization: number;
}

interface ResidentialInputs {
    monthlyRent: number;
    contractType: "libero_4_4" | "concordato_3_2";
    istatAdjustment: number;
    registrationCostAnnual: number;
    defaultRiskPercent: number;
}

type TaxRegime = "cedolare_secca" | "irpef";

// ── Calcoli ─────────────────────────────────────────────────────────────

function calcShortTerm(
    property: PropertyInputs,
    st: ShortTermInputs,
    occupancyPercent: number,
    taxRegime: TaxRegime,
    otherIncome: number,
) {
    const daysOccupied = Math.round(365 * occupancyPercent / 100);
    const stays = st.averageStayNights > 0 ? Math.round(daysOccupied / st.averageStayNights) : 0;

    const grossRevenue = daysOccupied * st.nightlyRate;
    const touristTax = daysOccupied * st.touristTaxPerNight; // non tassabile, incassato per conto del comune
    const platformFees = grossRevenue * st.platformFeePercent / 100;
    const cleaningTotal = stays * st.cleaningCostPerStay;
    const laundryTotal = stays * st.laundryConsumablesPerStay;
    const utilitiesTotal = st.utilitiesMonthly * 12;

    const propertyManagerCost = property.usePropertyManager
        ? grossRevenue * property.propertyManagerPercent / 100
        : 0;

    const operatingCosts = platformFees + cleaningTotal + laundryTotal + utilitiesTotal + propertyManagerCost;

    const fixedCosts = property.imuAnnual + property.condominiumMonthly * 12
        + property.insuranceAnnual + property.maintenanceAnnual;

    const taxableIncome = grossRevenue - operatingCosts;
    const cedolarRate = st.isSecondProperty ? 0.26 : 0.21;
    const taxes = taxRegime === "cedolare_secca"
        ? Math.max(0, taxableIncome) * cedolarRate
        : calcIrpefMarginal(Math.max(0, taxableIncome), otherIncome);

    const netAnnual = grossRevenue - operatingCosts - fixedCosts - taxes;
    const netMonthly = netAnnual / 12;
    const grossYield = property.propertyValue > 0 ? (grossRevenue / property.propertyValue) * 100 : 0;
    const netYield = property.propertyValue > 0 ? (netAnnual / property.propertyValue) * 100 : 0;

    return {
        daysOccupied, stays, grossRevenue, touristTax,
        platformFees, cleaningTotal, laundryTotal, utilitiesTotal,
        propertyManagerCost, operatingCosts, fixedCosts, taxableIncome,
        taxes, netAnnual, netMonthly, grossYield, netYield,
    };
}

function calcTransitional(
    property: PropertyInputs,
    tr: TransitionalInputs,
    taxRegime: TaxRegime,
    otherIncome: number,
) {
    // Calcolo mese per mese
    const monthDetails = tr.monthlySchedule.map((m, i) => {
        const revenue = m.occupied ? m.rent : 0;
        const utilities = m.occupied && tr.utilitiesIncluded ? tr.utilitiesMonthly : 0;
        return { month: MONTH_LABELS[i], revenue, utilities, occupied: m.occupied, rent: m.rent };
    });

    const monthsOccupied = monthDetails.filter(m => m.occupied).length;
    const grossRevenue = monthDetails.reduce((a, m) => a + m.revenue, 0);
    const utilitiesCost = monthDetails.reduce((a, m) => a + m.utilities, 0);

    const avgRent = monthsOccupied > 0 ? grossRevenue / monthsOccupied : 0;
    const agencyCost = tr.agencyFeeMonths > 0 ? avgRent * tr.agencyFeeMonths / 12 : 0;
    const furnishingCost = tr.furnishingAmortization;

    const propertyManagerCost = property.usePropertyManager
        ? grossRevenue * property.propertyManagerPercent / 100
        : 0;

    const operatingCosts = utilitiesCost + agencyCost + furnishingCost + propertyManagerCost;

    const fixedCosts = property.imuAnnual + property.condominiumMonthly * 12
        + property.insuranceAnnual + property.maintenanceAnnual;

    const taxableIncome = grossRevenue - operatingCosts;
    const taxes = taxRegime === "cedolare_secca"
        ? Math.max(0, taxableIncome) * 0.21
        : calcIrpefMarginal(Math.max(0, taxableIncome), otherIncome);

    const netAnnual = grossRevenue - operatingCosts - fixedCosts - taxes;
    const netMonthly = netAnnual / 12;
    const grossYield = property.propertyValue > 0 ? (grossRevenue / property.propertyValue) * 100 : 0;
    const netYield = property.propertyValue > 0 ? (netAnnual / property.propertyValue) * 100 : 0;

    return {
        monthDetails, monthsOccupied, grossRevenue, utilitiesCost, agencyCost,
        furnishingCost, propertyManagerCost, operatingCosts, fixedCosts,
        taxableIncome, taxes, netAnnual, netMonthly, grossYield, netYield,
    };
}

function calcResidential(
    property: PropertyInputs,
    res: ResidentialInputs,
    taxRegime: TaxRegime,
    otherIncome: number,
) {
    const effectiveMonths = 12 * (1 - res.defaultRiskPercent / 100);
    const grossRevenue = res.monthlyRent * effectiveMonths;
    const registrationCost = res.registrationCostAnnual;

    const propertyManagerCost = property.usePropertyManager
        ? grossRevenue * property.propertyManagerPercent / 100
        : 0;

    const operatingCosts = registrationCost + propertyManagerCost;

    const fixedCosts = property.imuAnnual + property.condominiumMonthly * 12
        + property.insuranceAnnual + property.maintenanceAnnual;

    const taxableIncome = grossRevenue - operatingCosts;
    const cedolarRate = res.contractType === "concordato_3_2" ? 0.10 : 0.21;
    const taxes = taxRegime === "cedolare_secca"
        ? Math.max(0, taxableIncome) * cedolarRate
        : calcIrpefMarginal(Math.max(0, taxableIncome), otherIncome);

    const netAnnual = grossRevenue - operatingCosts - fixedCosts - taxes;
    const netMonthly = netAnnual / 12;
    const grossYield = property.propertyValue > 0 ? (grossRevenue / property.propertyValue) * 100 : 0;
    const netYield = property.propertyValue > 0 ? (netAnnual / property.propertyValue) * 100 : 0;

    // Proiezione 10 anni con adeguamento ISTAT
    const projection10y = Array.from({ length: 10 }, (_, i) => {
        const adjustedRent = res.monthlyRent * Math.pow(1 + res.istatAdjustment / 100, i);
        const yearGross = adjustedRent * effectiveMonths;
        const yearTaxable = yearGross - operatingCosts;
        const yearTaxes = taxRegime === "cedolare_secca"
            ? Math.max(0, yearTaxable) * cedolarRate
            : calcIrpefMarginal(Math.max(0, yearTaxable), otherIncome);
        const yearNet = yearGross - operatingCosts - fixedCosts - yearTaxes;
        return { year: i + 1, gross: yearGross, net: yearNet, rent: adjustedRent };
    });

    return {
        effectiveMonths, grossRevenue, registrationCost, propertyManagerCost,
        operatingCosts, fixedCosts, taxableIncome, taxes,
        netAnnual, netMonthly, grossYield, netYield, projection10y,
    };
}

function calcIrpefMarginal(additionalIncome: number, existingIncome: number): number {
    const totalTax = calcIrpef(existingIncome + additionalIncome);
    const baseTax = calcIrpef(existingIncome);
    return totalTax - baseTax;
}

function calcIrpef(income: number): number {
    if (income <= 0) return 0;
    if (income <= 28000) return income * 0.23;
    if (income <= 50000) return 28000 * 0.23 + (income - 28000) * 0.35;
    return 28000 * 0.23 + 22000 * 0.35 + (income - 50000) * 0.43;
}

// ── Sotto-componenti ────────────────────────────────────────────────────

const PropertyInputsSection = memo(function PropertyInputsSection({
    values, onChange,
}: {
    values: PropertyInputs;
    onChange: <K extends keyof PropertyInputs>(key: K, val: PropertyInputs[K]) => void;
}) {
    return (
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-6">
            <div>
                <h3 className="text-xl font-bold flex items-center text-slate-900 dark:text-slate-100">
                    <Home className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" /> Dati Immobile
                </h3>
                <p className="text-sm text-slate-500 mt-1">Caratteristiche e costi fissi della proprietà</p>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">Valore Immobile</Label>
                    <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatEuro(values.propertyValue)}</span>
                </div>
                <Slider value={[values.propertyValue]} min={30000} max={2000000} step={5000}
                    onValueChange={(v) => onChange("propertyValue", v[0])} className="py-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">IMU Annuale</Label>
                    <Input type="number" step="50" value={values.imuAnnual}
                        onChange={(e) => onChange("imuAnnual", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Condominio /mese</Label>
                    <Input type="number" step="10" value={values.condominiumMonthly}
                        onChange={(e) => onChange("condominiumMonthly", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Assicurazione /anno</Label>
                    <Input type="number" step="50" value={values.insuranceAnnual}
                        onChange={(e) => onChange("insuranceAnnual", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Manutenzione /anno</Label>
                    <Input type="number" step="100" value={values.maintenanceAnnual}
                        onChange={(e) => onChange("maintenanceAnnual", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Property Manager</Label>
                    </div>
                    <Switch checked={values.usePropertyManager}
                        onCheckedChange={(v) => onChange("usePropertyManager", v)} />
                </div>
                {values.usePropertyManager && (
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Commissione Property Manager (%)</Label>
                        <div className="flex items-center gap-3">
                            <Slider value={[values.propertyManagerPercent]} min={5} max={40} step={1}
                                onValueChange={(v) => onChange("propertyManagerPercent", v[0])} className="flex-1" />
                            <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 w-12 text-right">
                                {values.propertyManagerPercent}%
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
});

const ShortTermPanel = memo(function ShortTermPanel({
    values, onChange,
}: {
    values: ShortTermInputs;
    onChange: <K extends keyof ShortTermInputs>(key: K, val: ShortTermInputs[K]) => void;
}) {
    return (
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-6">
            <div>
                <h3 className="text-lg font-bold flex items-center text-slate-900 dark:text-slate-100">
                    <BedDouble className="w-5 h-5 mr-3 text-amber-600 dark:text-amber-400" /> Affitto Breve Termine
                </h3>
                <p className="text-xs text-slate-500 mt-1">Airbnb, Booking.com, affitti turistici</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Tariffa Media /notte</Label>
                    <Input type="number" step="5" value={values.nightlyRate}
                        onChange={(e) => onChange("nightlyRate", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Durata Media Soggiorno (notti)</Label>
                    <Input type="number" step="1" value={values.averageStayNights}
                        onChange={(e) => onChange("averageStayNights", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                        <Brush className="w-3 h-3" /> Pulizia /soggiorno
                    </Label>
                    <Input type="number" step="5" value={values.cleaningCostPerStay}
                        onChange={(e) => onChange("cleaningCostPerStay", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Biancheria e Consumabili /soggiorno</Label>
                    <Input type="number" step="5" value={values.laundryConsumablesPerStay}
                        onChange={(e) => onChange("laundryConsumablesPerStay", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                        <Percent className="w-3 h-3" /> Commissione Piattaforma (%)
                    </Label>
                    <Input type="number" step="0.5" value={values.platformFeePercent}
                        onChange={(e) => onChange("platformFeePercent", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Utenze Extra /mese
                    </Label>
                    <Input type="number" step="10" value={values.utilitiesMonthly}
                        onChange={(e) => onChange("utilitiesMonthly", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500 flex items-center gap-1">
                        <Receipt className="w-3 h-3" /> Tassa di Soggiorno /notte
                    </Label>
                    <Input type="number" step="0.5" value={values.touristTaxPerNight}
                        onChange={(e) => onChange("touristTaxPerNight", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2 flex items-end pb-1">
                    <div className="flex items-center gap-2">
                        <Switch checked={values.isSecondProperty}
                            onCheckedChange={(v) => onChange("isSecondProperty", v)} />
                        <Label className="text-xs text-slate-500">Seconda proprietà (26%)</Label>
                    </div>
                </div>
            </div>
        </section>
    );
});

const TransitionalPanel = memo(function TransitionalPanel({
    values, onChange, onScheduleUpdate,
}: {
    values: TransitionalInputs;
    onChange: <K extends keyof TransitionalInputs>(key: K, val: TransitionalInputs[K]) => void;
    onScheduleUpdate: (index: number, field: keyof MonthScheduleEntry, val: number | boolean) => void;
}) {
    const occupiedCount = values.monthlySchedule.filter(m => m.occupied).length;

    const applyToAll = (rent: number) => {
        onChange("monthlySchedule", values.monthlySchedule.map(m => ({ ...m, rent })));
    };

    return (
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-6">
            <div>
                <h3 className="text-lg font-bold flex items-center text-slate-900 dark:text-slate-100">
                    <CalendarClock className="w-5 h-5 mr-3 text-violet-600 dark:text-violet-400" /> Affitto Transitorio
                </h3>
                <p className="text-xs text-slate-500 mt-1">Personalizza canone e occupazione mese per mese</p>
            </div>

            {/* Canone rapido per tutti i mesi */}
            <div className="flex items-center gap-3">
                <Label className="text-xs text-slate-500 whitespace-nowrap">Imposta tutti a</Label>
                <Input type="number" step="50" placeholder="€ canone"
                    className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100 w-28 h-8 text-xs"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") applyToAll(Number((e.target as HTMLInputElement).value));
                    }}
                    onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v > 0) applyToAll(v);
                    }}
                />
                <span className="text-[10px] text-slate-400">{occupiedCount}/12 mesi occupati</span>
            </div>

            {/* Griglia mese per mese */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {values.monthlySchedule.map((entry, i) => (
                    <div key={i} className={`rounded-xl p-3 space-y-2 border transition-all ${
                        entry.occupied
                            ? "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800"
                            : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-60"
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{MONTH_LABELS[i]}</span>
                            <Switch checked={entry.occupied}
                                onCheckedChange={(v) => onScheduleUpdate(i, "occupied", v)} size="sm" />
                        </div>
                        <Input type="number" step="50" value={entry.rent}
                            onChange={(e) => onScheduleUpdate(i, "rent", Number(e.target.value))}
                            disabled={!entry.occupied}
                            className="h-7 text-xs bg-white/70 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100 disabled:opacity-40" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Costo Agenzia (mesi di canone)</Label>
                    <Input type="number" step="0.5" value={values.agencyFeeMonths}
                        onChange={(e) => onChange("agencyFeeMonths", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Ammortamento Arredamento /anno</Label>
                    <Input type="number" step="100" value={values.furnishingAmortization}
                        onChange={(e) => onChange("furnishingAmortization", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-slate-500" />
                    <Label className="text-sm text-slate-700 dark:text-slate-300">Utenze incluse nel canone</Label>
                </div>
                <Switch checked={values.utilitiesIncluded}
                    onCheckedChange={(v) => onChange("utilitiesIncluded", v)} />
            </div>

            {values.utilitiesIncluded && (
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Costo Utenze /mese (a tuo carico)</Label>
                    <Input type="number" step="10" value={values.utilitiesMonthly}
                        onChange={(e) => onChange("utilitiesMonthly", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
            )}
        </section>
    );
});

const ResidentialPanel = memo(function ResidentialPanel({
    values, onChange,
}: {
    values: ResidentialInputs;
    onChange: <K extends keyof ResidentialInputs>(key: K, val: ResidentialInputs[K]) => void;
}) {
    return (
        <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-6">
            <div>
                <h3 className="text-lg font-bold flex items-center text-slate-900 dark:text-slate-100">
                    <Building2 className="w-5 h-5 mr-3 text-emerald-600 dark:text-emerald-400" /> Affitto Residenziale
                </h3>
                <p className="text-xs text-slate-500 mt-1">Contratti 4+4 (libero) o 3+2 (concordato)</p>
            </div>

            <div className="space-y-2">
                <Label className="text-xs text-slate-500">Tipo Contratto</Label>
                <Select value={values.contractType}
                    onValueChange={(v) => onChange("contractType", v as ResidentialInputs["contractType"])}>
                    <SelectTrigger className="w-full bg-white/50 dark:bg-slate-800/50 border-slate-200">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="libero_4_4">Libero 4+4 (cedolare 21%)</SelectItem>
                        <SelectItem value="concordato_3_2">Concordato 3+2 (cedolare 10%)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Canone Mensile</Label>
                    <Input type="number" step="50" value={values.monthlyRent}
                        onChange={(e) => onChange("monthlyRent", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Registrazione Contratto /anno</Label>
                    <Input type="number" step="10" value={values.registrationCostAnnual}
                        onChange={(e) => onChange("registrationCostAnnual", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Adeguamento ISTAT Annuo (%)</Label>
                    <Input type="number" step="0.1" value={values.istatAdjustment}
                        onChange={(e) => onChange("istatAdjustment", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-500">Rischio Morosità (%)</Label>
                    <Input type="number" step="1" value={values.defaultRiskPercent}
                        onChange={(e) => onChange("defaultRiskPercent", Number(e.target.value))}
                        className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                </div>
            </div>
        </section>
    );
});

// ── Componente KPI ──────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "blue" }: {
    label: string; value: string; sub?: string;
    color?: "blue" | "emerald" | "amber" | "violet" | "red";
}) {
    const colorMap = {
        blue: "text-blue-600 dark:text-blue-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
        amber: "text-amber-600 dark:text-amber-400",
        violet: "text-violet-600 dark:text-violet-400",
        red: "text-red-600 dark:text-red-400",
    };
    return (
        <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className={`text-xl font-bold tabular-nums ${colorMap[color]}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
        </div>
    );
}

// ── Salvataggio / Caricamento ───────────────────────────────────────────

interface RentalSaveData {
    property: PropertyInputs;
    taxRegime: TaxRegime;
    otherAnnualIncome: number;
    shortTerm: ShortTermInputs;
    stOccupancy: number;
    transitional: TransitionalInputs;
    residential: ResidentialInputs;
}

interface RentalSaveEntry {
    name: string;
    date: string;
    data: RentalSaveData;
}

const STORAGE_KEY = "fi_rental_income_saves";

function loadSaves(): RentalSaveEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function persistSaves(saves: RentalSaveEntry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
}

// ── Componente Principale ───────────────────────────────────────────────

export function RentalIncomeAnalyzer() {
    // Stato proprietà
    const [property, setProperty] = useState<PropertyInputs>({
        propertyValue: 200000,
        imuAnnual: 1200,
        condominiumMonthly: 80,
        insuranceAnnual: 300,
        maintenanceAnnual: 1000,
        propertyManagerPercent: 20,
        usePropertyManager: false,
    });

    // Regime fiscale e reddito
    const [taxRegime, setTaxRegime] = useState<TaxRegime>("cedolare_secca");
    const [otherAnnualIncome, setOtherAnnualIncome] = useState(30000);

    // Stato affitto breve
    const [shortTerm, setShortTerm] = useState<ShortTermInputs>({
        nightlyRate: 80,
        cleaningCostPerStay: 40,
        platformFeePercent: 15,
        laundryConsumablesPerStay: 15,
        utilitiesMonthly: 150,
        touristTaxPerNight: 2,
        averageStayNights: 3,
        isSecondProperty: false,
    });
    const [stOccupancy, setStOccupancy] = useState(50);

    // Stato transitorio
    const [transitional, setTransitional] = useState<TransitionalInputs>({
        monthlySchedule: createDefaultSchedule(700),
        utilitiesIncluded: false,
        utilitiesMonthly: 120,
        agencyFeeMonths: 1,
        furnishingAmortization: 500,
    });

    // Stato residenziale
    const [residential, setResidential] = useState<ResidentialInputs>({
        monthlyRent: 550,
        contractType: "libero_4_4",
        istatAdjustment: 1.5,
        registrationCostAnnual: 67,
        defaultRiskPercent: 5,
    });

    // ── Salvataggio / Caricamento ──
    const [saves, setSaves] = useState<RentalSaveEntry[]>(() => loadSaves());
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const handleSave = useCallback(() => {
        const name = saveName.trim();
        if (!name) return;
        const entry: RentalSaveEntry = {
            name,
            date: new Date().toISOString(),
            data: { property, taxRegime, otherAnnualIncome, shortTerm, stOccupancy, transitional, residential },
        };
        const updated = [...saves.filter(s => s.name !== name), entry];
        persistSaves(updated);
        setSaves(updated);
        setSaveName("");
        setShowSaveDialog(false);
        setSaveMessage(`"${name}" salvato`);
        setTimeout(() => setSaveMessage(null), 2500);
    }, [saveName, property, taxRegime, otherAnnualIncome, shortTerm, stOccupancy, transitional, residential, saves]);

    const handleLoad = useCallback((entry: RentalSaveEntry) => {
        const d = entry.data;
        setProperty(d.property);
        setTaxRegime(d.taxRegime);
        setOtherAnnualIncome(d.otherAnnualIncome);
        setShortTerm(d.shortTerm);
        setStOccupancy(d.stOccupancy);
        setTransitional(d.transitional);
        setResidential(d.residential);
        setShowLoadDialog(false);
        setSaveMessage(`"${entry.name}" caricato`);
        setTimeout(() => setSaveMessage(null), 2500);
    }, []);

    const handleDelete = useCallback((name: string) => {
        const updated = saves.filter(s => s.name !== name);
        persistSaves(updated);
        setSaves(updated);
    }, [saves]);

    const handleExport = useCallback(() => {
        const data: RentalSaveData = { property, taxRegime, otherAnnualIncome, shortTerm, stOccupancy, transitional, residential };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "rendita-immobili.json";
        a.click();
        URL.revokeObjectURL(url);
    }, [property, taxRegime, otherAnnualIncome, shortTerm, stOccupancy, transitional, residential]);

    const handleImport = useCallback(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target?.result as string) as RentalSaveData;
                    if (d.property && d.shortTerm && d.transitional && d.residential) {
                        setProperty(d.property);
                        setTaxRegime(d.taxRegime);
                        setOtherAnnualIncome(d.otherAnnualIncome);
                        setShortTerm(d.shortTerm);
                        setStOccupancy(d.stOccupancy);
                        setTransitional(d.transitional);
                        setResidential(d.residential);
                        setSaveMessage("File importato");
                        setTimeout(() => setSaveMessage(null), 2500);
                    }
                } catch {
                    setSaveMessage("File non valido");
                    setTimeout(() => setSaveMessage(null), 2500);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }, []);

    // Helper aggiornamento
    const updateProperty = <K extends keyof PropertyInputs>(key: K, val: PropertyInputs[K]) =>
        setProperty(prev => ({ ...prev, [key]: val }));
    const updateShortTerm = <K extends keyof ShortTermInputs>(key: K, val: ShortTermInputs[K]) =>
        setShortTerm(prev => ({ ...prev, [key]: val }));
    const updateTransitional = <K extends keyof TransitionalInputs>(key: K, val: TransitionalInputs[K]) =>
        setTransitional(prev => ({ ...prev, [key]: val }));
    const updateScheduleEntry = (index: number, field: keyof MonthScheduleEntry, val: number | boolean) =>
        setTransitional(prev => ({
            ...prev,
            monthlySchedule: prev.monthlySchedule.map((m, i) =>
                i === index ? { ...m, [field]: val } : m
            ),
        }));
    const updateResidential = <K extends keyof ResidentialInputs>(key: K, val: ResidentialInputs[K]) =>
        setResidential(prev => ({ ...prev, [key]: val }));

    // Calcoli
    const stResults = useMemo(() =>
        calcShortTerm(property, shortTerm, stOccupancy, taxRegime, otherAnnualIncome),
        [property, shortTerm, stOccupancy, taxRegime, otherAnnualIncome]);

    const trResults = useMemo(() =>
        calcTransitional(property, transitional, taxRegime, otherAnnualIncome),
        [property, transitional, taxRegime, otherAnnualIncome]);

    const resResults = useMemo(() =>
        calcResidential(property, residential, taxRegime, otherAnnualIncome),
        [property, residential, taxRegime, otherAnnualIncome]);

    // Simulazione occupazione breve termine (multi-scenario)
    const stScenarios = useMemo(() =>
        [30, 50, 70, 90].map(occ => ({
            occupancy: occ,
            ...calcShortTerm(property, shortTerm, occ, taxRegime, otherAnnualIncome),
        })),
        [property, shortTerm, taxRegime, otherAnnualIncome]);

    // Confronto finale
    const comparison = useMemo(() => {
        const items = [
            { name: "Breve Termine", net: stResults.netAnnual, yield: stResults.netYield, monthly: stResults.netMonthly, color: "amber" as const },
            { name: "Transitorio", net: trResults.netAnnual, yield: trResults.netYield, monthly: trResults.netMonthly, color: "violet" as const },
            { name: "Residenziale", net: resResults.netAnnual, yield: resResults.netYield, monthly: resResults.netMonthly, color: "emerald" as const },
        ];
        const best = items.reduce((a, b) => a.net > b.net ? a : b);
        return { items, best };
    }, [stResults, trResults, resResults]);

    const fixedCostsAnnual = property.imuAnnual + property.condominiumMonthly * 12
        + property.insuranceAnnual + property.maintenanceAnnual;

    return (
        <div className="space-y-10 animate-in fade-in-50 duration-500">
            {/* Header */}
            <div className="text-center space-y-3 pt-2 pb-4">
                <div className="inline-flex items-center justify-center p-3 bg-white/70 dark:bg-slate-900/70 border border-white dark:border-slate-800 rounded-2xl shadow-sm mb-2 backdrop-blur-md">
                    <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    Rendita <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-amber-500">Immobili</span>
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    Confronta le strategie di messa a reddito del tuo immobile: affitto breve, transitorio o residenziale.
                </p>

                {/* Barra Salvataggio */}
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                        onClick={() => setShowSaveDialog(true)}>
                        <Save className="w-3.5 h-3.5" /> Salva
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                        onClick={() => setShowLoadDialog(true)}
                        disabled={saves.length === 0}>
                        <FolderOpen className="w-3.5 h-3.5" /> Carica{saves.length > 0 && ` (${saves.length})`}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                        onClick={handleExport}>
                        <Download className="w-3.5 h-3.5" /> Esporta
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                        onClick={handleImport}>
                        <Upload className="w-3.5 h-3.5" /> Importa
                    </Button>
                </div>

                {/* Messaggio feedback */}
                {saveMessage && (
                    <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in-50 duration-300">
                        {saveMessage}
                    </div>
                )}
            </div>

            {/* Dialog Salvataggio */}
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Salva Configurazione</DialogTitle>
                        <DialogDescription>
                            Dai un nome a questa configurazione per ritrovarla in seguito.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Input
                            placeholder="Nome configurazione (es. Appartamento Milano)"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                            autoFocus
                        />
                        {saves.some(s => s.name === saveName.trim()) && saveName.trim() && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                Esiste già un salvataggio con questo nome: verrà sovrascritto.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Annulla</Button>
                        <Button onClick={handleSave} disabled={!saveName.trim()}>
                            <Save className="w-4 h-4 mr-1.5" /> Salva
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Caricamento */}
            <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Carica Configurazione</DialogTitle>
                        <DialogDescription>
                            Seleziona una configurazione salvata per ripristinarla.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
                        {saves.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Nessun salvataggio trovato</p>
                        ) : (
                            saves
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((entry) => (
                                    <div key={entry.name}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                        <button
                                            className="flex-1 text-left"
                                            onClick={() => handleLoad(entry)}>
                                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                                {entry.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {new Date(entry.date).toLocaleString("it-IT", {
                                                    day: "2-digit", month: "short", year: "numeric",
                                                    hour: "2-digit", minute: "2-digit",
                                                })}
                                                {" — "}Immobile {formatEuro(entry.data.property.propertyValue)}
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(entry.name)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Elimina">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Input proprietà + regime fiscale */}
            <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 space-y-6">
                    <PropertyInputsSection values={property} onChange={updateProperty} />

                    {/* Regime Fiscale */}
                    <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Regime Fiscale</h3>
                                <p className="text-[10px] text-slate-500">Applicato al calcolo tasse su tutti e tre gli scenari</p>
                            </div>
                        </div>

                        <Select value={taxRegime} onValueChange={(v) => setTaxRegime(v as TaxRegime)}>
                            <SelectTrigger className="w-full bg-white/50 dark:bg-slate-800/50 border-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cedolare_secca">Cedolare Secca</SelectItem>
                                <SelectItem value="irpef">IRPEF Ordinaria</SelectItem>
                            </SelectContent>
                        </Select>

                        {taxRegime === "irpef" && (
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Reddito Annuo Lordo (altri redditi)</Label>
                                <Input type="number" step="1000" value={otherAnnualIncome}
                                    onChange={(e) => setOtherAnnualIncome(Number(e.target.value))}
                                    className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                                <p className="text-[10px] text-slate-400">Serve per calcolare l&apos;aliquota marginale IRPEF sul reddito da affitto</p>
                            </div>
                        )}
                    </section>

                    {/* Riepilogo costi fissi */}
                    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 p-5 rounded-3xl shadow-md flex justify-between items-center px-6">
                        <div className="space-y-1">
                            <div className="text-slate-600 dark:text-slate-400 font-bold text-sm">Costi Fissi Annui</div>
                            <div className="text-xs text-slate-500">IMU + Condominio + Assicurazione + Manutenzione</div>
                        </div>
                        <div className="text-2xl font-bold tracking-tight text-red-500 tabular-nums">{formatEuro(fixedCostsAnnual)}</div>
                    </div>
                </div>

                {/* Pannello risultati */}
                <div className="lg:col-span-7">
                    <div className="sticky top-8 space-y-6">
                        {/* Confronto Sintetico */}
                        <Card className="border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white dark:border-slate-800 rounded-3xl overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-5">
                                    <ArrowRightLeft className="w-5 h-5 text-slate-500" />
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confronto Strategie</h3>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {comparison.items.map((item) => (
                                        <div key={item.name} className={`rounded-2xl p-4 space-y-2 border-2 transition-all ${
                                            item.name === comparison.best.name
                                                ? "border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30"
                                                : "border-transparent bg-slate-50/80 dark:bg-slate-800/60"
                                        }`}>
                                            {item.name === comparison.best.name && (
                                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                    <Sparkles className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Migliore</span>
                                                </div>
                                            )}
                                            <div className="text-xs font-semibold text-slate-500">{item.name}</div>
                                            <div className={`text-xl font-bold tabular-nums ${
                                                item.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                            }`}>
                                                {formatEuro(item.net)}
                                                <span className="text-[10px] font-normal text-slate-400">/anno</span>
                                            </div>
                                            <div className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                                                {formatEuro(item.monthly)}<span className="text-[10px] font-normal text-slate-400">/mese</span>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Rend. netto: <span className={`font-bold ${item.yield >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>{formatPercent(item.yield)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Barra visuale confronto */}
                                <div className="space-y-2">
                                    {comparison.items.map((item) => {
                                        const maxNet = Math.max(...comparison.items.map(i => Math.abs(i.net)), 1);
                                        const width = Math.abs(item.net) / maxNet * 100;
                                        const colorBar = {
                                            amber: "bg-amber-500",
                                            violet: "bg-violet-500",
                                            emerald: "bg-emerald-500",
                                        }[item.color];
                                        return (
                                            <div key={item.name} className="flex items-center gap-3">
                                                <span className="text-xs font-medium text-slate-500 w-24 text-right">{item.name}</span>
                                                <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-700 ${colorBar}`}
                                                        style={{ width: `${Math.max(width, 2)}%` }} />
                                                </div>
                                                <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300 w-20">
                                                    {formatEuro(item.net)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dettaglio per strategia */}
                        <Card className="border-none shadow-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white dark:border-slate-800 rounded-3xl overflow-hidden">
                            <CardContent className="p-2 md:p-4">
                                <Tabs defaultValue="short_term" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl mb-6">
                                        <TabsTrigger value="short_term" className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:text-slate-100 text-slate-500 font-semibold transition-all text-xs md:text-sm">
                                            <BedDouble className="w-4 h-4 mr-1.5 text-amber-500" /> Breve
                                        </TabsTrigger>
                                        <TabsTrigger value="transitional" className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:text-slate-100 text-slate-500 font-semibold transition-all text-xs md:text-sm">
                                            <CalendarClock className="w-4 h-4 mr-1.5 text-violet-500" /> Transitorio
                                        </TabsTrigger>
                                        <TabsTrigger value="residential" className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:text-slate-100 text-slate-500 font-semibold transition-all text-xs md:text-sm">
                                            <Building2 className="w-4 h-4 mr-1.5 text-emerald-500" /> Residenziale
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="px-4 md:px-6 pb-8 pt-2">
                                        {/* ── Breve Termine ── */}
                                        <TabsContent value="short_term" className="animate-in fade-in-50 duration-500 space-y-6">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">Tasso Occupazione</Label>
                                                    <span className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400">{stOccupancy}%</span>
                                                </div>
                                                <Slider value={[stOccupancy]} min={10} max={100} step={5}
                                                    onValueChange={(v) => setStOccupancy(v[0])} className="py-2" />
                                                <p className="text-[10px] text-slate-400">{stResults.daysOccupied} giorni occupati, ~{stResults.stays} soggiorni/anno</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <KpiCard label="Fatturato Lordo" value={formatEuro(stResults.grossRevenue)} color="amber" />
                                                <KpiCard label="Costi Operativi" value={formatEuro(stResults.operatingCosts)}
                                                    sub={`Piattaforma ${formatEuro(stResults.platformFees)} + Pulizia ${formatEuro(stResults.cleaningTotal)}`} color="red" />
                                                <KpiCard label="Costi Fissi" value={formatEuro(stResults.fixedCosts)} color="red" />
                                                <KpiCard label="Tasse" value={formatEuro(stResults.taxes)}
                                                    sub={taxRegime === "cedolare_secca" ? `Cedolare ${shortTerm.isSecondProperty ? "26" : "21"}%` : "IRPEF marginale"} color="red" />
                                                <KpiCard label="Reddito Netto Annuo" value={formatEuro(stResults.netAnnual)} color={stResults.netAnnual >= 0 ? "emerald" : "red"} />
                                                <KpiCard label="Rendimento Netto" value={formatPercent(stResults.netYield)} sub={`Lordo: ${formatPercent(stResults.grossYield)}`} color="blue" />
                                            </div>

                                            {/* Simulazione multi-occupazione */}
                                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center mb-4">
                                                    <BarChart3 className="w-4 h-4 mr-2 text-amber-500" /> Simulazione per Occupazione
                                                </h4>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                                <th className="text-left py-2 font-semibold text-slate-500">Occupaz.</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Giorni</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Lordo</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Netto /anno</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Netto /mese</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Rend. %</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {stScenarios.map(s => (
                                                                <tr key={s.occupancy} className={`border-b border-slate-100 dark:border-slate-800 ${s.occupancy === stOccupancy ? "bg-amber-50/50 dark:bg-amber-950/20 font-semibold" : ""}`}>
                                                                    <td className="py-2 text-slate-700 dark:text-slate-300">{s.occupancy}%</td>
                                                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{s.daysOccupied}gg</td>
                                                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{formatEuro(s.grossRevenue)}</td>
                                                                    <td className={`py-2 text-right ${s.netAnnual >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{formatEuro(s.netAnnual)}</td>
                                                                    <td className={`py-2 text-right ${s.netMonthly >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{formatEuro(s.netMonthly)}</td>
                                                                    <td className="py-2 text-right text-blue-600 dark:text-blue-400">{formatPercent(s.netYield)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* ── Transitorio ── */}
                                        <TabsContent value="transitional" className="animate-in fade-in-50 duration-500 space-y-6">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {trResults.monthsOccupied}/12 mesi occupati
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    Configura mese per mese nel pannello in basso
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <KpiCard label="Fatturato Lordo" value={formatEuro(trResults.grossRevenue)} color="violet" />
                                                <KpiCard label="Costi Operativi" value={formatEuro(trResults.operatingCosts)}
                                                    sub={`Utenze + Agenzia + Arredamento`} color="red" />
                                                <KpiCard label="Costi Fissi" value={formatEuro(trResults.fixedCosts)} color="red" />
                                                <KpiCard label="Tasse" value={formatEuro(trResults.taxes)}
                                                    sub={taxRegime === "cedolare_secca" ? "Cedolare 21%" : "IRPEF marginale"} color="red" />
                                                <KpiCard label="Reddito Netto Annuo" value={formatEuro(trResults.netAnnual)} color={trResults.netAnnual >= 0 ? "emerald" : "red"} />
                                                <KpiCard label="Rendimento Netto" value={formatPercent(trResults.netYield)} sub={`Lordo: ${formatPercent(trResults.grossYield)}`} color="blue" />
                                            </div>

                                            {/* Dettaglio mese per mese */}
                                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center mb-4">
                                                    <CalendarClock className="w-4 h-4 mr-2 text-violet-500" /> Dettaglio Mensile
                                                </h4>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                                <th className="text-left py-2 font-semibold text-slate-500">Mese</th>
                                                                <th className="text-center py-2 font-semibold text-slate-500">Stato</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Canone</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Utenze</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Netto</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {trResults.monthDetails.map((m, i) => (
                                                                <tr key={i} className={`border-b border-slate-100 dark:border-slate-800 ${
                                                                    !m.occupied ? "opacity-40" : ""
                                                                }`}>
                                                                    <td className="py-2 text-slate-700 dark:text-slate-300 font-medium">{m.month}</td>
                                                                    <td className="py-2 text-center">
                                                                        <span className={`inline-block w-2 h-2 rounded-full ${m.occupied ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                                                                    </td>
                                                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                                                                        {m.occupied ? formatEuro(m.revenue) : "—"}
                                                                    </td>
                                                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400 tabular-nums">
                                                                        {m.utilities > 0 ? `-${formatEuro(m.utilities)}` : "—"}
                                                                    </td>
                                                                    <td className={`py-2 text-right tabular-nums ${
                                                                        m.occupied ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                                                                    }`}>
                                                                        {m.occupied ? formatEuro(m.revenue - m.utilities) : "—"}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tr className="font-bold border-t-2 border-slate-300 dark:border-slate-600">
                                                            <td className="py-2 text-slate-900 dark:text-slate-100" colSpan={2}>Totale</td>
                                                            <td className="py-2 text-right text-violet-600 dark:text-violet-400 tabular-nums">{formatEuro(trResults.grossRevenue)}</td>
                                                            <td className="py-2 text-right text-red-500 tabular-nums">{trResults.utilitiesCost > 0 ? `-${formatEuro(trResults.utilitiesCost)}` : "—"}</td>
                                                            <td className="py-2 text-right text-emerald-600 dark:text-emerald-400 tabular-nums">{formatEuro(trResults.grossRevenue - trResults.utilitiesCost)}</td>
                                                        </tr>
                                                    </table>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* ── Residenziale ── */}
                                        <TabsContent value="residential" className="animate-in fade-in-50 duration-500 space-y-6">
                                            <div className="grid grid-cols-2 gap-3">
                                                <KpiCard label="Fatturato Lordo" value={formatEuro(resResults.grossRevenue)}
                                                    sub={`${resResults.effectiveMonths.toFixed(1)} mesi effettivi`} color="emerald" />
                                                <KpiCard label="Costi Operativi" value={formatEuro(resResults.operatingCosts)}
                                                    sub="Registrazione contratto" color="red" />
                                                <KpiCard label="Costi Fissi" value={formatEuro(resResults.fixedCosts)} color="red" />
                                                <KpiCard label="Tasse" value={formatEuro(resResults.taxes)}
                                                    sub={taxRegime === "cedolare_secca"
                                                        ? `Cedolare ${residential.contractType === "concordato_3_2" ? "10" : "21"}%`
                                                        : "IRPEF marginale"} color="red" />
                                                <KpiCard label="Reddito Netto Annuo" value={formatEuro(resResults.netAnnual)} color={resResults.netAnnual >= 0 ? "emerald" : "red"} />
                                                <KpiCard label="Rendimento Netto" value={formatPercent(resResults.netYield)} sub={`Lordo: ${formatPercent(resResults.grossYield)}`} color="blue" />
                                            </div>

                                            {/* Proiezione 10 anni */}
                                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center mb-4">
                                                    <TrendingUp className="w-4 h-4 mr-2 text-emerald-500" /> Proiezione 10 Anni (Adeguamento ISTAT {formatPercent(residential.istatAdjustment)}/anno)
                                                </h4>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                                <th className="text-left py-2 font-semibold text-slate-500">Anno</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Canone /mese</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Lordo /anno</th>
                                                                <th className="text-right py-2 font-semibold text-slate-500">Netto /anno</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {resResults.projection10y.map(p => (
                                                                <tr key={p.year} className="border-b border-slate-100 dark:border-slate-800">
                                                                    <td className="py-2 text-slate-700 dark:text-slate-300">Anno {p.year}</td>
                                                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{formatEuro(p.rent)}</td>
                                                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{formatEuro(p.gross)}</td>
                                                                    <td className={`py-2 text-right ${p.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{formatEuro(p.net)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tr className="font-bold border-t-2 border-slate-300 dark:border-slate-600">
                                                            <td className="py-2 text-slate-900 dark:text-slate-100" colSpan={3}>Totale Netto 10 Anni</td>
                                                            <td className="py-2 text-right text-emerald-600 dark:text-emerald-400">
                                                                {formatEuro(resResults.projection10y.reduce((a, p) => a + p.net, 0))}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Input specifici per strategia */}
            <div className="grid md:grid-cols-3 gap-6">
                <ShortTermPanel values={shortTerm} onChange={updateShortTerm} />
                <TransitionalPanel values={transitional} onChange={updateTransitional} onScheduleUpdate={updateScheduleEntry} />
                <ResidentialPanel values={residential} onChange={updateResidential} />
            </div>
        </div>
    );
}
