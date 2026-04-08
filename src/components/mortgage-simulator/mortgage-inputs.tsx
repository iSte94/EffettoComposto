"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { HomeIcon, ScrollText, Briefcase, TrendingUp, Wallet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatEuro } from "@/lib/format";
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
        <div className="lg:col-span-12 xl:col-span-5 space-y-8">
            {/* Reddito Netto per Simulazione */}
            <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-5 rounded-3xl shadow-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-blue-600 dark:text-blue-400">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Reddito Netto Mensile</h3>
                            <p className="text-[10px] text-slate-500">Usato per calcolare il rapporto rata/reddito</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Input
                            type="number" step="100"
                            value={netIncome}
                            onChange={(e) => onUpdate("netIncome", Number(e.target.value))}
                            className="w-32 h-10 text-center font-bold text-lg bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl focus-visible:ring-blue-500"
                        />
                        <Button
                            variant="outline" size="sm"
                            className="h-10 px-3 text-xs rounded-xl border-blue-200 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950"
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/preferences');
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
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reset
                        </Button>
                    </div>
                </div>
            </section>

            {/* Sezione Acquisto Immobile */}
            <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-7 group hover:shadow-lg transition-all duration-500">
                <div>
                    <h3 className="text-xl font-bold flex items-center text-slate-900 dark:text-slate-100">
                        <HomeIcon className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" /> Dettagli Proprietà e Mutuo
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Costi dell&apos;immobile, Tasse e Mutuo futuro</p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <Label htmlFor="price" className="text-slate-700 dark:text-slate-300 font-semibold">Prezzo d&apos;Acquisto Immobile</Label>
                        <span className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatEuro(propertyPrice)}</span>
                    </div>
                    <Slider value={[propertyPrice]} min={50000} max={2000000} step={5000} onValueChange={(val) => onUpdate("propertyPrice", val[0])} className="py-2" />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <Label htmlFor="downpayment" className="text-slate-700 dark:text-slate-300 font-semibold">Tuo Anticipo</Label>
                        <div className="text-right">
                            <span className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">{formatEuro(downpayment)}</span>
                            <span className="text-xs text-slate-500 ml-2">({(downpayment / propertyPrice * 100).toFixed(1)}%)</span>
                        </div>
                    </div>
                    <Slider value={[downpayment]} min={0} max={propertyPrice} step={5000} onValueChange={(val) => onUpdate("downpayment", val[0])} className="py-2" />
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center">
                            <ScrollText className="w-4 h-4 mr-2 text-slate-500" /> Spese Accessorie
                        </h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="taxes" className="text-xs text-slate-500">Imposte</Label>
                            <Input id="taxes" type="number" step="100" value={purchaseTaxes} onChange={(e) => onUpdate("purchaseTaxes", Number(e.target.value))} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notary" className="text-xs text-slate-500">Notaio</Label>
                            <Input id="notary" type="number" step="100" value={notaryFees} onChange={(e) => onUpdate("notaryFees", Number(e.target.value))} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="agency" className="text-xs text-slate-500">Agenzia</Label>
                            <Input id="agency" type="number" step="100" value={agencyFees} onChange={(e) => onUpdate("agencyFees", Number(e.target.value))} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                    <div className="space-y-3">
                        <Label htmlFor="rate" className="text-slate-700 dark:text-slate-300 font-semibold">Tasso Nuovo Mutuo (%)</Label>
                        <Input id="rate" type="number" step="0.1" value={rate} onChange={(e) => onUpdate("rate", Number(e.target.value))} className="text-lg bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100 focus-visible:ring-blue-500" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="years" className="text-slate-700 dark:text-slate-300 font-semibold">Durata (Anni)</Label>
                        <Input id="years" type="number" value={years} onChange={(e) => onUpdate("years", Number(e.target.value))} className="text-lg bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100 focus-visible:ring-blue-500" />
                    </div>
                </div>
            </section>

            {/* Sezione Affitto & Mercato */}
            <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-7 group hover:shadow-lg transition-all duration-500">
                <div>
                    <h3 className="text-xl font-bold flex items-center text-slate-900 dark:text-slate-100">
                        <Briefcase className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400" /> Affitto e Costo Opportunità
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Stima i ricavi se metti la proprietà a reddito.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Label htmlFor="rent" className="text-slate-700 dark:text-slate-300 font-semibold">Affitto Mensile Atteso</Label>
                        <Input id="rent" type="number" step="50" value={expectedRent} onChange={(e) => onUpdate("expectedRent", Number(e.target.value))} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="maint" className="text-slate-700 dark:text-slate-300 font-semibold">Spese (IMU, Cedolare, ecc.)</Label>
                        <Input id="maint" type="number" step="10" value={maintenanceTaxes} onChange={(e) => onUpdate("maintenanceTaxes", Number(e.target.value))} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2 text-slate-500" /> Variabili di Mercato a Lungo Termine
                        </h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="vacancy" className="text-xs text-slate-500">Sfitto Annuo (%)</Label>
                            <Input id="vacancy" type="number" step="1" value={vacancyRate} onChange={(e) => onUpdate("vacancyRate", Number(e.target.value))} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="inflation" className="text-xs text-slate-500">Inflaz. Affitti (%)</Label>
                            <Input id="inflation" type="number" step="0.5" value={rentInflation} onChange={(e) => onUpdate("rentInflation", Number(e.target.value))} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="extramaint" className="text-xs text-slate-500">Manut. Straord. (&euro;)</Label>
                            <Input id="extramaint" type="number" step="1000" value={extraMaintenance} onChange={(e) => onUpdate("extraMaintenance", Number(e.target.value))} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 text-slate-900 dark:text-slate-100" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-end">
                        <Label htmlFor="market" className="text-slate-700 dark:text-slate-300 font-semibold">Rendimento Alternativo Mercato (%)</Label>
                        <span className="font-mono text-lg font-bold text-purple-600 dark:text-purple-400">{marketReturn.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Simula cosa succederebbe investendo questa liquidità in un ETF invece di comprare la casa.</p>
                    <Slider value={[marketReturn]} min={1} max={15} step={0.1} onValueChange={(val) => onUpdate("marketReturn", val[0])} className="py-2" />
                </div>
            </section>
        </div>
    );
}
