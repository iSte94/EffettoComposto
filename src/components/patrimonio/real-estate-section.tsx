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
        <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
            <CardHeader className="border-b border-slate-200/80 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-800/60 sm:p-6">
                <CardTitle className="flex flex-col gap-3 text-lg text-slate-900 dark:text-slate-100 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-3">
                        <HomeIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Immobili Reali
                    </span>
                    <span className="w-fit rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-600 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400">
                        Totale Netto: {formatEuro(realEstateNetValue)}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-5 p-4 sm:p-6">
                {realEstateList.map((prop, idx) => (
                    <div key={prop.id} className="group relative rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 h-10 w-10 rounded-full text-rose-500 opacity-100 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/50 sm:opacity-0 sm:group-hover:opacity-100"
                            onClick={() => onListChange(realEstateList.filter(p => p.id !== prop.id))}
                            aria-label="Rimuovi immobile"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                                <div className="sm:col-span-3">
                                    <Label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Nome Immobile</Label>
                                    <Input
                                        value={prop.name}
                                        onChange={e => updateProp(idx, { name: e.target.value })}
                                        onBlur={onTriggerSave}
                                        placeholder="Es. Casa Roma"
                                        className="h-11 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Valore Stimato</Label>
                                    <Input
                                        type="number"
                                        value={prop.value}
                                        onChange={e => updateProp(idx, { value: Number(e.target.value) })}
                                        onBlur={onTriggerSave}
                                        className="h-11 border-emerald-200 bg-emerald-50 font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                                    />
                                    {prop.linkedLoanId && (
                                        <div className="mt-1 flex justify-between rounded-lg border border-emerald-100 bg-emerald-100/60 px-2 py-1 text-[10px] text-slate-500 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-slate-400">
                                            <span>Valore Netto:</span>
                                            <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                                {formatEuro(Math.max(0, (prop.value || 0) - calculateRemainingDebt(existingLoansList.find(l => l.id === prop.linkedLoanId))))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <Label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Spese Fisse</Label>
                                    <Input
                                        type="number"
                                        value={prop.costs}
                                        onChange={e => updateProp(idx, { costs: Number(e.target.value) })}
                                        onBlur={onTriggerSave}
                                        className="h-11 border-rose-200 bg-rose-50 font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Costo IMU</Label>
                                    <Input
                                        type="number"
                                        value={prop.imu || 0}
                                        onChange={e => updateProp(idx, { imu: Number(e.target.value) })}
                                        onBlur={onTriggerSave}
                                        className="h-11 border-rose-200 bg-rose-50 font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Rendita Annua Attesa</Label>
                                    <Input
                                        type="number"
                                        value={prop.rent}
                                        onChange={e => updateProp(idx, { rent: Number(e.target.value) })}
                                        onBlur={onTriggerSave}
                                        className="h-11 border-slate-200 bg-white text-emerald-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-emerald-400"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Prima Casa?</Label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Se e prima casa, il costo IMU non viene sottratto dai flussi di cassa.</p>
                                    </div>
                                    <Switch
                                        checked={prop.isPrimaryResidence || false}
                                        onCheckedChange={(checked) => {
                                            updateProp(idx, { isPrimaryResidence: checked });
                                            onTriggerSave();
                                        }}
                                        className="data-[state=checked]:bg-blue-500"
                                    />
                                </div>

                                <div className="mt-4 flex flex-col gap-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200">Immobile a rendita attiva?</Label>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Se attivo, l&apos;affitto corrente entra nel cashflow.</p>
                                        </div>
                                        <Switch
                                            checked={prop.isRented || false}
                                            onCheckedChange={(checked) => {
                                                updateProp(idx, { isRented: checked, ...(checked ? { rentStartDate: undefined } : {}) });
                                                onTriggerSave();
                                            }}
                                            className="data-[state=checked]:bg-emerald-500"
                                        />
                                    </div>

                                    {!prop.isRented && (
                                        <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40 sm:flex-row sm:items-center">
                                            <div className="space-y-0.5 sm:mr-4 sm:w-1/2">
                                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Inizio Rendita Previsto</Label>
                                                <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">Mese/Anno da cui iniziera a staccare affitto per FIRE.</p>
                                            </div>
                                            <Input
                                                type="month"
                                                value={prop.rentStartDate || ""}
                                                onChange={e => updateProp(idx, { rentStartDate: e.target.value })}
                                                onBlur={onTriggerSave}
                                                className="h-11 flex-1 border-slate-200 bg-white/80 text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                                            />
                                        </div>
                                    )}
                                </div>

                                {existingLoansList.filter(l => l.category === "Casa").length > 0 && (
                                    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-0.5 sm:w-[55%]">
                                            <Label className="flex items-center text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                <LinkIcon className="mr-1.5 h-3.5 w-3.5 text-blue-500" /> Mutuo Collegato
                                            </Label>
                                            <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">Sottrae automaticamente il debito residuo dal valore netto dell&apos;immobile.</p>
                                        </div>
                                        <div className="flex flex-col gap-1.5 sm:w-[45%]">
                                            <Select
                                                value={prop.linkedLoanId || "none"}
                                                onValueChange={(val) => {
                                                    updateProp(idx, { linkedLoanId: val === "none" ? undefined : val });
                                                    onTriggerSave();
                                                }}
                                            >
                                                <SelectTrigger className="h-11 w-full border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-900/70">
                                                    <SelectValue placeholder="Nessun mutuo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Nessun mutuo (Proprieta 100%)</SelectItem>
                                                    {existingLoansList.filter(l => l.category === "Casa").map(loan => (
                                                        <SelectItem key={loan.id} value={loan.id}>{loan.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {prop.linkedLoanId && (
                                                <div className="w-full rounded-lg border border-rose-100 bg-rose-50 px-2 py-1 text-right text-[10px] font-medium text-rose-500 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
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

                <Button
                    variant="outline"
                    className="w-full rounded-2xl border-2 border-dashed border-emerald-300 py-6 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    onClick={() => {
                        onListChange([...realEstateList, { id: Date.now().toString(), name: `Immobile ${realEstateList.length + 1}`, value: 0, costs: 0, imu: 0, isPrimaryResidence: false, rent: 0, isRented: false }]);
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" /> Aggiungi Immobile
                </Button>

                {realEstateList.length > 0 && (
                    <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-4 text-sm dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Totale Immobili (Lordo)</span>
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{formatEuro(realEstateGrossValue)}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
