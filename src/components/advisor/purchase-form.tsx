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
    auto: { label: "Automobile", icon: <Car className="w-5 h-5" />, color: "blue", description: "Nuova o usata, con analisi TCO e svalutazione" },
    immobile: { label: "Immobile", icon: <Home className="w-5 h-5" />, color: "emerald", description: "Acquisto casa con analisi rendimento e mutuo" },
    arredamento: { label: "Arredamento", icon: <Sofa className="w-5 h-5" />, color: "amber", description: "Mobili, cucina, elettrodomestici di valore" },
    altro: { label: "Altra Spesa", icon: <ShoppingCart className="w-5 h-5" />, color: "purple", description: "Qualsiasi spesa importante da valutare" },
};

interface PurchaseFormProps {
    sim: PurchaseSimulation;
    onUpdateSim: (updates: Partial<PurchaseSimulation>) => void;
    onAnalyze: () => void;
}

export { categoryConfig };

export const PurchaseForm = memo(function PurchaseForm({ sim, onUpdateSim, onAnalyze }: PurchaseFormProps) {
    return (
        <div className="lg:col-span-5 space-y-6">
            {/* Categoria */}
            <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Tipo di Acquisto
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {(Object.entries(categoryConfig) as [PurchaseCategory, typeof categoryConfig.auto][]).map(([key, config]) => (
                        <button key={key} onClick={() => onUpdateSim({ category: key })}
                            className={`p-4 rounded-2xl border-2 transition-all text-left ${sim.category === key ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 shadow-md" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={sim.category === key ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"}>{config.icon}</span>
                                <span className={`font-bold text-sm ${sim.category === key ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>{config.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">{config.description}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Dettagli Acquisto */}
            <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {categoryConfig[sim.category].icon}
                    <span className="text-slate-500 font-normal text-sm ml-1">Dettagli</span>
                </h3>
                <div className="space-y-4">
                    <div>
                        <Label className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Descrizione (opzionale)</Label>
                        <Input placeholder={sim.category === "auto" ? "es. BMW Serie 3 2024" : sim.category === "immobile" ? "es. Bilocale Milano Isola" : "es. Cucina Scavolini"}
                            value={sim.itemName} onChange={(e) => onUpdateSim({ itemName: e.target.value })}
                            className="mt-1 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <Label className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Prezzo Totale</Label>
                            <Input type="number" step={sim.category === "arredamento" ? 100 : sim.category === "auto" ? 500 : 5000}
                                value={sim.totalPrice} onChange={(e) => { const v = Number(e.target.value); onUpdateSim({ totalPrice: v, downPayment: Math.min(sim.downPayment, v) }); }}
                                className="w-36 h-9 text-right font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl" />
                        </div>
                        <Slider value={[sim.totalPrice]}
                            min={sim.category === "arredamento" ? 500 : sim.category === "auto" ? 3000 : 50000}
                            max={sim.category === "arredamento" ? 50000 : sim.category === "auto" ? 150000 : 2000000}
                            step={sim.category === "arredamento" ? 100 : sim.category === "auto" ? 500 : 5000}
                            onValueChange={(val) => onUpdateSim({ totalPrice: val[0], downPayment: Math.min(sim.downPayment, val[0]) })} />
                    </div>

                    {/* Finanziamento */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Finanziamento / Prestito</Label>
                            <Switch checked={sim.isFinanced} onCheckedChange={(v) => onUpdateSim({ isFinanced: v })} />
                        </div>
                        {sim.isFinanced && (
                            <div className="space-y-4 animate-in fade-in-50 duration-300">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <Label className="text-xs text-slate-500">Anticipo</Label>
                                        <div className="flex items-center gap-2">
                                            <Input type="number" step={500} value={sim.downPayment}
                                                onChange={(e) => onUpdateSim({ downPayment: Math.min(Number(e.target.value), sim.totalPrice) })}
                                                className="w-28 h-8 text-right font-mono text-sm font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl" />
                                            <span className="text-xs text-slate-500 w-10">({((sim.downPayment / sim.totalPrice) * 100).toFixed(0)}%)</span>
                                        </div>
                                    </div>
                                    <Slider value={[sim.downPayment]} min={0} max={sim.totalPrice} step={500} onValueChange={(val) => onUpdateSim({ downPayment: val[0] })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500">Tasso (%)</Label>
                                        <Input type="number" step="0.1" value={sim.financingRate} onChange={(e) => onUpdateSim({ financingRate: Number(e.target.value) })}
                                            className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500">Durata (anni)</Label>
                                        <Input type="number" value={sim.financingYears} onChange={(e) => onUpdateSim({ financingYears: Number(e.target.value) })}
                                            className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Costi Specifici per Categoria */}
            {sim.category === "auto" && (
                <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Car className="w-4 h-4 text-blue-500" /> Costi di Possesso Auto
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs text-slate-500">Assicurazione/anno</Label><Input type="number" value={sim.annualInsurance} onChange={(e) => onUpdateSim({ annualInsurance: Number(e.target.value) })} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" /></div>
                        <div className="space-y-1"><Label className="text-xs text-slate-500">Manutenzione/anno</Label><Input type="number" value={sim.annualMaintenance} onChange={(e) => onUpdateSim({ annualMaintenance: Number(e.target.value) })} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" /></div>
                        <div className="space-y-1"><Label className="text-xs text-slate-500">Carburante/mese</Label><Input type="number" value={sim.monthlyFuel} onChange={(e) => onUpdateSim({ monthlyFuel: Number(e.target.value) })} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" /></div>
                        <div className="space-y-1"><Label className="text-xs text-slate-500">Svalutazione/anno (%)</Label><Input type="number" step="1" value={sim.depreciationRate} onChange={(e) => onUpdateSim({ depreciationRate: Number(e.target.value) })} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" /></div>
                    </div>
                </section>
            )}

            {sim.category === "immobile" && (
                <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Home className="w-4 h-4 text-emerald-500" /> Costi e Rendita Immobile
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs text-slate-500">Affitto Mensile Atteso</Label><Input type="number" value={sim.monthlyRent} onChange={(e) => onUpdateSim({ monthlyRent: Number(e.target.value) })} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" /></div>
                        <div className="space-y-1"><Label className="text-xs text-slate-500">Condominio/mese</Label><Input type="number" value={sim.condominiumFees} onChange={(e) => onUpdateSim({ condominiumFees: Number(e.target.value) })} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" /></div>
                        <div className="space-y-1 col-span-2"><Label className="text-xs text-slate-500">IMU + Tasse/mese</Label><Input type="number" value={sim.imuTax} onChange={(e) => onUpdateSim({ imuTax: Number(e.target.value) })} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" /></div>
                    </div>
                </section>
            )}

            {sim.category === "arredamento" && (
                <section className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Sofa className="w-4 h-4 text-amber-500" /> Vita Utile Stimata
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <Label className="text-xs text-slate-500">Durata prevista (anni)</Label>
                            <Input type="number" step={1} min={1} value={sim.usefulLifeYears}
                                onChange={(e) => onUpdateSim({ usefulLifeYears: Math.max(1, Number(e.target.value)) })}
                                className="w-20 h-8 text-right font-mono text-sm font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl" />
                        </div>
                        <Slider value={[sim.usefulLifeYears]} min={1} max={30} step={1} onValueChange={(val) => onUpdateSim({ usefulLifeYears: val[0] })} />
                    </div>
                </section>
            )}

            <Button onClick={onAnalyze}
                className="w-full py-6 text-lg font-bold rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all">
                <ShieldCheck className="w-5 h-5 mr-2" /> Analizza Acquisto
            </Button>
        </div>
    );
});
