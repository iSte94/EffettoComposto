"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Car, Home, Sofa, ShoppingCart } from "lucide-react";
import type { PurchaseSimulation, PurchaseCategory } from "@/types";

const categoryConfig: Record<PurchaseCategory, { label: string; icon: React.ReactNode; color: string; description: string }> = {
    auto: { label: "Automobile", icon: <Car className="h-5 w-5" />, color: "blue", description: "Nuova o usata, con analisi TCO e svalutazione" },
    immobile: { label: "Immobile", icon: <Home className="h-5 w-5" />, color: "emerald", description: "Acquisto casa con analisi rendimento e mutuo" },
    arredamento: { label: "Arredamento", icon: <Sofa className="h-5 w-5" />, color: "amber", description: "Mobili, cucina, elettrodomestici di valore" },
    altro: { label: "Altra Spesa", icon: <ShoppingCart className="h-5 w-5" />, color: "purple", description: "Qualsiasi spesa importante da valutare" },
};

interface PurchaseFormProps {
    sim: PurchaseSimulation;
    onUpdateSim: (updates: Partial<PurchaseSimulation>) => void;
    onAnalyze: () => void;
}

export { categoryConfig };

export const PurchaseForm = memo(function PurchaseForm({ sim, onUpdateSim, onAnalyze }: PurchaseFormProps) {
    return (
        <div className="space-y-6 lg:col-span-5">
            <section className="space-y-5 rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                    <ShoppingCart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Tipo di Acquisto
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(Object.entries(categoryConfig) as [PurchaseCategory, typeof categoryConfig.auto][]).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => onUpdateSim({ category: key })}
                            className={`rounded-2xl border-2 p-4 text-left transition-all ${sim.category === key ? "border-indigo-500 bg-indigo-50 shadow-md dark:bg-indigo-950/50" : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"}`}
                        >
                            <div className="mb-1 flex items-center gap-2">
                                <span className={sim.category === key ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"}>{config.icon}</span>
                                <span className={`text-sm font-bold ${sim.category === key ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>{config.label}</span>
                            </div>
                            <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">{config.description}</p>
                        </button>
                    ))}
                </div>
            </section>

            <section className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                    {categoryConfig[sim.category].icon}
                    <span className="text-sm font-normal text-slate-500">Dettagli</span>
                </h3>
                <div className="space-y-4">
                    <div>
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Descrizione (opzionale)</Label>
                        <Input
                            placeholder={sim.category === "auto" ? "es. BMW Serie 3 2024" : sim.category === "immobile" ? "es. Bilocale Milano Isola" : "es. Cucina Scavolini"}
                            value={sim.itemName}
                            onChange={(e) => onUpdateSim({ itemName: e.target.value })}
                            className="mt-1 h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-end justify-between gap-3">
                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prezzo Totale</Label>
                            <Input
                                type="number"
                                step={sim.category === "arredamento" ? 100 : sim.category === "auto" ? 500 : 5000}
                                value={sim.totalPrice}
                                onChange={(e) => {
                                    const v = Number(e.target.value);
                                    onUpdateSim({ totalPrice: v, downPayment: Math.min(sim.downPayment, v) });
                                }}
                                className="h-11 w-36 rounded-xl border-slate-200 bg-slate-50 text-right font-mono text-lg font-bold text-indigo-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-indigo-400"
                            />
                        </div>
                        <Slider
                            value={[sim.totalPrice]}
                            min={sim.category === "arredamento" ? 500 : sim.category === "auto" ? 3000 : 50000}
                            max={sim.category === "arredamento" ? 50000 : sim.category === "auto" ? 150000 : 2000000}
                            step={sim.category === "arredamento" ? 100 : sim.category === "auto" ? 500 : 5000}
                            onValueChange={(val) => onUpdateSim({ totalPrice: val[0], downPayment: Math.min(sim.downPayment, val[0]) })}
                        />
                    </div>

                    <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-4">
                            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Finanziamento / Prestito</Label>
                            <Switch checked={sim.isFinanced} onCheckedChange={(v) => onUpdateSim({ isFinanced: v })} />
                        </div>
                        {sim.isFinanced && (
                            <div className="space-y-4 animate-in fade-in-50 duration-300">
                                <div className="space-y-2">
                                    <div className="flex items-end justify-between gap-3">
                                        <Label className="text-xs text-slate-500 dark:text-slate-400">Anticipo</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                step={500}
                                                value={sim.downPayment}
                                                onChange={(e) => onUpdateSim({ downPayment: Math.min(Number(e.target.value), sim.totalPrice) })}
                                                className="h-10 w-28 rounded-xl border-slate-200 bg-slate-50 text-right font-mono text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
                                            />
                                            <span className="w-10 text-xs text-slate-500">({((sim.downPayment / sim.totalPrice) * 100).toFixed(0)}%)</span>
                                        </div>
                                    </div>
                                    <Slider value={[sim.downPayment]} min={0} max={sim.totalPrice} step={500} onValueChange={(val) => onUpdateSim({ downPayment: val[0] })} />
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 dark:text-slate-400">Tasso (%)</Label>
                                        <Input type="number" step="0.1" value={sim.financingRate} onChange={(e) => onUpdateSim({ financingRate: Number(e.target.value) })} className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 dark:text-slate-400">Durata (anni)</Label>
                                        <Input type="number" value={sim.financingYears} onChange={(e) => onUpdateSim({ financingYears: Number(e.target.value) })} className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {sim.category === "auto" && (
                <section className="space-y-5 rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-6">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <Car className="h-4 w-4 text-blue-500" /> Costi di Possesso Auto
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1"><Label className="text-xs text-slate-500 dark:text-slate-400">Assicurazione/anno</Label><Input type="number" value={sim.annualInsurance} onChange={(e) => onUpdateSim({ annualInsurance: Number(e.target.value) })} className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" /></div>
                        <div className="space-y-1"><Label className="text-xs text-slate-500 dark:text-slate-400">Manutenzione/anno</Label><Input type="number" value={sim.annualMaintenance} onChange={(e) => onUpdateSim({ annualMaintenance: Number(e.target.value) })} className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" /></div>
                        <div className="space-y-1"><Label className="text-xs text-slate-500 dark:text-slate-400">Carburante/mese</Label><Input type="number" value={sim.monthlyFuel} onChange={(e) => onUpdateSim({ monthlyFuel: Number(e.target.value) })} className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" /></div>
                        <div className="space-y-1"><Label className="text-xs text-slate-500 dark:text-slate-400">Svalutazione/anno (%)</Label><Input type="number" step="1" value={sim.depreciationRate} onChange={(e) => onUpdateSim({ depreciationRate: Number(e.target.value) })} className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" /></div>
                    </div>
                </section>
            )}

            {sim.category === "immobile" && (
                <section className="space-y-5 rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-6">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <Home className="h-4 w-4 text-emerald-500" /> Costi e Rendita Immobile
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1"><Label className="text-xs text-slate-500 dark:text-slate-400">Affitto Mensile Atteso</Label><Input type="number" value={sim.monthlyRent} onChange={(e) => onUpdateSim({ monthlyRent: Number(e.target.value) })} className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" /></div>
                        <div className="space-y-1"><Label className="text-xs text-slate-500 dark:text-slate-400">Condominio/mese</Label><Input type="number" value={sim.condominiumFees} onChange={(e) => onUpdateSim({ condominiumFees: Number(e.target.value) })} className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" /></div>
                        <div className="space-y-1 sm:col-span-2"><Label className="text-xs text-slate-500 dark:text-slate-400">IMU + Tasse/mese</Label><Input type="number" value={sim.imuTax} onChange={(e) => onUpdateSim({ imuTax: Number(e.target.value) })} className="h-11 border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" /></div>
                    </div>
                </section>
            )}

            {sim.category === "arredamento" && (
                <section className="space-y-5 rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-6">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <Sofa className="h-4 w-4 text-amber-500" /> Vita Utile Stimata
                    </h3>
                    <div className="space-y-2">
                        <div className="flex items-end justify-between gap-3">
                            <Label className="text-xs text-slate-500 dark:text-slate-400">Durata prevista (anni)</Label>
                            <Input type="number" step={1} min={1} value={sim.usefulLifeYears} onChange={(e) => onUpdateSim({ usefulLifeYears: Math.max(1, Number(e.target.value)) })} className="h-10 w-20 rounded-xl border-slate-200 bg-slate-50 text-right font-mono text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100" />
                        </div>
                        <Slider value={[sim.usefulLifeYears]} min={1} max={30} step={1} onValueChange={(val) => onUpdateSim({ usefulLifeYears: val[0] })} />
                    </div>
                </section>
            )}

            <Button onClick={onAnalyze} className="h-12 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-6 text-lg font-bold text-white shadow-lg transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl">
                <ShieldCheck className="mr-2 h-5 w-5" /> Analizza Acquisto
            </Button>
        </div>
    );
});
