"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeIcon, Plus, Trash2, LinkIcon } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { calculateRemainingDebt } from "@/lib/finance/loans";
import type { RealEstateProperty, ExistingLoan } from "@/types";

interface RealEstateSectionProps {
    realEstateList: RealEstateProperty[];
    existingLoansList: ExistingLoan[];
    realEstateGrossValue: number;
    realEstateNetValue: number;
    onListChange: (list: RealEstateProperty[]) => void;
    onTriggerSave: () => void;
}

export const RealEstateSection = memo(function RealEstateSection({
    realEstateList, existingLoansList, realEstateGrossValue, realEstateNetValue,
    onListChange, onTriggerSave,
}: RealEstateSectionProps) {
    const updateProp = (idx: number, updates: Partial<RealEstateProperty>) => {
        const newList = [...realEstateList];
        newList[idx] = { ...newList[idx], ...updates };
        onListChange(newList);
    };

    return (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500">
            <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 p-6">
                <CardTitle className="flex items-center text-lg text-slate-900 dark:text-slate-100 justify-between">
                    <span className="flex items-center"><HomeIcon className="w-5 h-5 mr-3 text-emerald-600 dark:text-emerald-400" /> Immobili Reali</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                        Totale Netto: {formatEuro(realEstateNetValue)}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5 flex flex-col">
                {realEstateList.map((prop, idx) => (
                    <div key={prop.id} className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 relative group-hover:border-slate-300 transition-all shadow-sm hover:shadow-md">
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-all" onClick={() => onListChange(realEstateList.filter(p => p.id !== prop.id))}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="space-y-4">
                            <div className="grid grid-cols-5 gap-4">
                                <div className="col-span-3">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1 block">Nome Immobile</Label>
                                    <Input value={prop.name} onChange={e => updateProp(idx, { name: e.target.value })} onBlur={onTriggerSave} placeholder="Es. Casa Roma" className="bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 h-9 focus-visible:ring-emerald-500" />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1 block">Valore Stimato</Label>
                                    <Input type="number" value={prop.value} onChange={e => updateProp(idx, { value: Number(e.target.value) })} onBlur={onTriggerSave} className="bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 font-bold text-emerald-700 dark:text-emerald-300 h-9 focus-visible:ring-emerald-500" />
                                    {prop.linkedLoanId && (
                                        <div className="text-[10px] text-slate-500 mt-1 flex justify-between bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-100">
                                            <span>Valore Netto:</span>
                                            <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatEuro(Math.max(0, (prop.value || 0) - calculateRemainingDebt(existingLoansList.find(l => l.id === prop.linkedLoanId))))}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-slate-400 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 block">Spese Fisse</Label>
                                    <Input type="number" value={prop.costs} onChange={e => updateProp(idx, { costs: Number(e.target.value) })} onBlur={onTriggerSave} className="bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-semibold h-9 focus-visible:ring-rose-500" placeholder="Es. Condominio" />
                                </div>
                                <div>
                                    <Label className="text-slate-400 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 block">Costo IMU</Label>
                                    <Input type="number" value={prop.imu || 0} onChange={e => updateProp(idx, { imu: Number(e.target.value) })} onBlur={onTriggerSave} className="bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-semibold h-9 focus-visible:ring-rose-500" placeholder="Es. 800" />
                                </div>
                                <div>
                                    <Label className="text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 block">Rendita Annua Attesa</Label>
                                    <Input type="number" value={prop.rent} onChange={e => updateProp(idx, { rent: Number(e.target.value) })} onBlur={onTriggerSave} className="bg-white text-emerald-600 dark:text-emerald-400 font-semibold h-9" />
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Prima Casa?</Label>
                                        <p className="text-[10px] text-slate-500">Se è prima casa, il costo IMU non verrà sottratto dai tuoi flussi di cassa.</p>
                                    </div>
                                    <Switch checked={prop.isPrimaryResidence || false}
                                        onCheckedChange={(checked) => { updateProp(idx, { isPrimaryResidence: checked }); onTriggerSave(); }}
                                        className="data-[state=checked]:bg-blue-500" />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Immobile a rendita attiva?</Label>
                                            <p className="text-[10px] text-slate-500">Se attivo, l&apos;affitto corrente entra live nel Cashflow.</p>
                                        </div>
                                        <Switch checked={prop.isRented || false}
                                            onCheckedChange={(checked) => {
                                                updateProp(idx, { isRented: checked, ...(checked ? { rentStartDate: undefined } : {}) });
                                                onTriggerSave();
                                            }}
                                            className="data-[state=checked]:bg-emerald-500" />
                                    </div>
                                    {!prop.isRented && (
                                        <div className="flex items-center justify-between pl-4 border-l-2 border-slate-200 dark:border-slate-700 ml-2 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-0.5 mr-4 w-1/2">
                                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Inizio Rendita Previsto</Label>
                                                <p className="text-[9px] text-slate-500 leading-tight">Mese/Anno da cui inizierà a staccare affitto per FIRE.</p>
                                            </div>
                                            <Input type="month" value={prop.rentStartDate || ""}
                                                onChange={e => updateProp(idx, { rentStartDate: e.target.value })}
                                                onBlur={onTriggerSave}
                                                className="h-8 text-xs bg-white/50 dark:bg-slate-800/50 flex-grow" />
                                        </div>
                                    )}
                                </div>
                                {existingLoansList.filter(l => l.category === "Casa").length > 0 && (
                                    <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                        <div className="space-y-0.5 w-[55%]">
                                            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                                                <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Mutuo Collegato
                                            </Label>
                                            <p className="text-[10px] text-slate-500 leading-tight">Sottrae automaticamente il debito residuo dal valore netto dell&apos;immobile.</p>
                                        </div>
                                        <div className="w-[45%] flex flex-col items-end gap-1.5">
                                            <Select value={prop.linkedLoanId || "none"}
                                                onValueChange={(val) => { updateProp(idx, { linkedLoanId: val === "none" ? undefined : val }); onTriggerSave(); }}>
                                                <SelectTrigger className="w-full bg-white text-xs h-8 border-slate-200">
                                                    <SelectValue placeholder="Nessun mutuo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Nessun mutuo (Proprietà 100%)</SelectItem>
                                                    {existingLoansList.filter(l => l.category === "Casa").map(loan => (
                                                        <SelectItem key={loan.id} value={loan.id}>{loan.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {prop.linkedLoanId && (
                                                <div className="text-[10px] text-rose-500 font-medium bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-100 w-full text-right shadow-sm">
                                                    Debito Residuo: -{formatEuro(calculateRemainingDebt(existingLoansList.find(l => l.id === prop.linkedLoanId)))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                <Button variant="outline" className="w-full border-dashed border-2 py-6 text-slate-500 hover:text-blue-600 dark:text-blue-400 hover:border-blue-300 hover:bg-blue-50 transition-colors" onClick={() => {
                    onListChange([...realEstateList, { id: Date.now().toString(), name: `Immobile ${realEstateList.length + 1}`, value: 0, costs: 0, imu: 0, isPrimaryResidence: false, rent: 0, isRented: false }]);
                }}>
                    <Plus className="w-4 h-4 mr-2" /> Aggiungi Immobile
                </Button>

                {realEstateList.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Totale Immobili (Lordo)</span>
                        <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">{formatEuro(realEstateGrossValue)}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
