"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { HomeIcon, ScrollText, Briefcase, TrendingUp, Wallet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatEuro } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { MortgagePreferences } from "@/hooks/usePreferences";

interface MortgageInputsProps {
    preferences: MortgagePreferences;
    onUpdate: <K extends keyof MortgagePreferences>(key: K, value: MortgagePreferences[K]) => void;
}

export function MortgageInputs({ preferences, onUpdate }: MortgageInputsProps) {
    const {
        propertyPrice, downpayment, purchaseTaxes, notaryFees, agencyFees,
        netIncome, rate, years, expectedRent, maintenanceTaxes,
        marketReturn, vacancyRate, rentInflation, extraMaintenance
    } = preferences;

    return (
        <div className="space-y-8 xl:col-span-5 lg:col-span-12">
            <section className="rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Reddito Netto Mensile</h3>
                                <InfoTooltip>Usato per calcolare il rapporto rata/reddito (DTI). Le banche lo usano per valutare la sostenibilita&#768; del mutuo.</InfoTooltip>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            type="number"
                            step="100"
                            value={netIncome}
                            onChange={(e) => onUpdate("netIncome", Number(e.target.value))}
                            className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 text-center font-bold text-lg text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 sm:w-32"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-11 rounded-xl border-blue-200 px-3 text-xs text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/40"
                            onClick={async () => {
                                try {
                                    const res = await fetch("/api/preferences");
                                    const data = await res.json();
                                    if (data.preferences?.netIncome != null) {
                                        onUpdate("netIncome", data.preferences.netIncome);
                                        toast.success("Reddito aggiornato dal Patrimonio");
                                    }
                                } catch {
                                    toast.error("Errore nel caricamento");
                                }
                            }}
                            title="Ricarica dal Patrimonio"
                        >
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
                        </Button>
                    </div>
                </div>
            </section>

            <section className="space-y-7 rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-6">
                <div>
                    <h3 className="flex items-center text-xl font-bold text-slate-900 dark:text-slate-100">
                        <HomeIcon className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400" /> Dettagli Proprieta e Mutuo
                    </h3>
                </div>

                <div className="space-y-4">
                    <div className="flex items-end justify-between gap-3">
                        <Label htmlFor="price" className="font-semibold text-slate-700 dark:text-slate-300">Prezzo d&apos;Acquisto Immobile</Label>
                        <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatEuro(propertyPrice)}</span>
                    </div>
                    <Slider value={[propertyPrice]} min={50000} max={2000000} step={5000} onValueChange={(val) => onUpdate("propertyPrice", val[0])} className="py-2" />
                </div>

                <div className="space-y-4">
                    <div className="flex items-end justify-between gap-3">
                        <Label htmlFor="downpayment" className="font-semibold text-slate-700 dark:text-slate-300">Tuo Anticipo</Label>
                        <div className="text-right">
                            <span className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">{formatEuro(downpayment)}</span>
                            <span className="ml-2 text-xs text-slate-500">({(downpayment / propertyPrice * 100).toFixed(1)}%)</span>
                        </div>
                    </div>
                    <Slider value={[downpayment]} min={0} max={propertyPrice} step={5000} onValueChange={(val) => onUpdate("downpayment", val[0])} className="py-2" />
                </div>

                <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <h4 className="flex items-center text-sm font-bold text-slate-800 dark:text-slate-200">
                        <ScrollText className="mr-2 h-4 w-4 text-slate-500" /> Spese Accessorie
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="taxes" className="text-xs text-slate-500 dark:text-slate-400">Imposte</Label>
                            <Input id="taxes" type="number" step="100" value={purchaseTaxes} onChange={(e) => onUpdate("purchaseTaxes", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notary" className="text-xs text-slate-500 dark:text-slate-400">Notaio</Label>
                            <Input id="notary" type="number" step="100" value={notaryFees} onChange={(e) => onUpdate("notaryFees", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="agency" className="text-xs text-slate-500 dark:text-slate-400">Agenzia</Label>
                            <Input id="agency" type="number" step="100" value={agencyFees} onChange={(e) => onUpdate("agencyFees", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:grid-cols-2">
                    <div className="space-y-3">
                        <Label htmlFor="rate" className="font-semibold text-slate-700 dark:text-slate-300">Tasso Nuovo Mutuo (%)</Label>
                        <Input id="rate" type="number" step="0.1" value={rate} onChange={(e) => onUpdate("rate", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-lg text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="years" className="font-semibold text-slate-700 dark:text-slate-300">Durata (Anni)</Label>
                        <Input id="years" type="number" value={years} onChange={(e) => onUpdate("years", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-lg text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                    </div>
                </div>
            </section>

            <section className="space-y-7 rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-6">
                <div>
                    <h3 className="flex items-center text-xl font-bold text-slate-900 dark:text-slate-100">
                        <Briefcase className="mr-3 h-5 w-5 text-purple-600 dark:text-purple-400" /> Affitto e Costo Opportunita
                    </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-3">
                        <Label htmlFor="rent" className="font-semibold text-slate-700 dark:text-slate-300">Affitto Mensile Atteso</Label>
                        <Input id="rent" type="number" step="50" value={expectedRent} onChange={(e) => onUpdate("expectedRent", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="maint" className="font-semibold text-slate-700 dark:text-slate-300">Spese (IMU, Cedolare, ecc.)</Label>
                        <Input id="maint" type="number" step="10" value={maintenanceTaxes} onChange={(e) => onUpdate("maintenanceTaxes", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                    </div>
                </div>

                <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <h4 className="flex items-center text-sm font-bold text-slate-900 dark:text-slate-100">
                        <TrendingUp className="mr-2 h-4 w-4 text-slate-500" /> Variabili di Mercato a Lungo Termine
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="vacancy" className="text-xs text-slate-500 dark:text-slate-400">Sfitto Annuo (%)</Label>
                            <Input id="vacancy" type="number" step="1" value={vacancyRate} onChange={(e) => onUpdate("vacancyRate", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="inflation" className="text-xs text-slate-500 dark:text-slate-400">Inflaz. Affitti (%)</Label>
                            <Input id="inflation" type="number" step="0.5" value={rentInflation} onChange={(e) => onUpdate("rentInflation", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="extramaint" className="text-xs text-slate-500 dark:text-slate-400">Manut. Straord. (€)</Label>
                            <Input id="extramaint" type="number" step="1000" value={extraMaintenance} onChange={(e) => onUpdate("extraMaintenance", Number(e.target.value))} className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <div className="flex items-end justify-between gap-3">
                        <div className="flex items-center gap-1">
                            <Label htmlFor="market" className="font-semibold text-slate-700 dark:text-slate-300">Rendimento Alternativo Mercato (%)</Label>
                            <InfoTooltip>Simula cosa succederebbe investendo la liquidita&#768; (anticipo + spese) in un ETF/azionario invece di comprare casa. Usato nel confronto costo opportunita&#768;.</InfoTooltip>
                        </div>
                        <span className="font-mono text-lg font-bold text-purple-600 dark:text-purple-400">{marketReturn.toFixed(1)}%</span>
                    </div>
                    <Slider value={[marketReturn]} min={1} max={15} step={0.1} onValueChange={(val) => onUpdate("marketReturn", val[0])} className="py-2" />
                </div>
            </section>
        </div>
    );
}
