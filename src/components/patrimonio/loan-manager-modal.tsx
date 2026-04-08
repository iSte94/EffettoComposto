"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { ExistingLoan } from "@/types";

interface LoanManagerModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editingLoan: ExistingLoan | null;
    newLoan: ExistingLoan;
    onEditingLoanChange: (loan: ExistingLoan | null) => void;
    onNewLoanChange: (loan: ExistingLoan) => void;
    onAdd: () => void;
    onUpdate: () => void;
}

export function LoanManagerModal({
    isOpen, onOpenChange, editingLoan, newLoan,
    onEditingLoanChange, onNewLoanChange, onAdd, onUpdate,
}: LoanManagerModalProps) {
    const loan = editingLoan || newLoan;
    const updateField = <K extends keyof ExistingLoan>(field: K, value: ExistingLoan[K]) => {
        if (editingLoan) {
            onEditingLoanChange({ ...editingLoan, [field]: value });
        } else {
            onNewLoanChange({ ...newLoan, [field]: value });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] bg-white/95 backdrop-blur-2xl border-white dark:border-slate-800 rounded-3xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {editingLoan ? "Modifica Prestito" : "Aggiungi Nuovo Prestito/Mutuo"}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="loan-name">Nome Prestito</Label>
                        <Input id="loan-name" value={loan.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            placeholder="es. Mutuo Prima Casa, Prestito Auto..."
                            className="h-11 bg-white border-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={loan.category} onValueChange={(val: ExistingLoan['category']) => updateField("category", val)}>
                                <SelectTrigger className="h-11 bg-white border-slate-200 text-slate-700 dark:text-slate-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Casa">Mutuo Casa</SelectItem>
                                    <SelectItem value="Auto">Finanziamento Auto</SelectItem>
                                    <SelectItem value="Arredamento">Arredamento</SelectItem>
                                    <SelectItem value="Personale">Prestito Personale</SelectItem>
                                    <SelectItem value="Altro">Altro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Rata Mensile</Label>
                            <Input type="number" value={loan.installment}
                                onChange={(e) => updateField("installment", Number(e.target.value))}
                                className="h-11 bg-white border-slate-200 text-rose-600 dark:text-rose-400 font-bold" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                        <div className="space-y-2">
                            <Label>Mese Inizio (YYYY-MM)</Label>
                            <Input type="month" value={loan.startDate} onChange={(e) => updateField("startDate", e.target.value)} className="h-11 bg-white border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <Label>Mese Fine (YYYY-MM)</Label>
                            <Input type="month" value={loan.endDate} onChange={(e) => updateField("endDate", e.target.value)} className="h-11 bg-white border-slate-200" />
                        </div>
                    </div>
                    <div className="pt-2">
                        <Label className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mb-3 block italic">Dati Extra (Opzionali per precisione debito residuo)</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Importo Originario (&euro;)</Label>
                                <Input type="number" placeholder="Opzionale" value={loan.originalAmount || ''} onChange={(e) => updateField("originalAmount", Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 text-xs" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Tasso Interesse (%)</Label>
                                <Input type="number" step="0.1" placeholder="Opzionale" value={loan.interestRate || ''} onChange={(e) => updateField("interestRate", Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 text-xs" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Debito Residuo Manuale (&euro;)</Label>
                        <Input type="number" placeholder="Lascia vuoto per calcolo automatico" value={loan.currentRemainingDebt || ''} onChange={(e) => updateField("currentRemainingDebt", Number(e.target.value))} className="h-9 bg-slate-50 border-slate-200 text-xs" />
                        <p className="text-[10px] text-slate-400">Se inserito, sovrascrive il calcolo automatico del debito residuo.</p>
                    </div>
                    <div className="pt-2">
                        <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="space-y-0.5">
                                <Label className="text-xs font-bold text-blue-800 uppercase tracking-wide">Rata Crescente?</Label>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400">Se attivo, la rata cresce linearmente nel tempo.</p>
                            </div>
                            <Switch checked={loan.isVariable || false} onCheckedChange={(checked) => updateField("isVariable", checked)} className="data-[state=checked]:bg-blue-600" />
                        </div>
                    </div>
                </div>
                <DialogFooter className="mt-4 gap-2">
                    <Button variant="ghost" onClick={() => { onOpenChange(false); onEditingLoanChange(null); }} className="rounded-2xl">Annulla</Button>
                    <Button onClick={editingLoan ? onUpdate : onAdd} className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl px-6">
                        {editingLoan ? "Applica Modifiche" : "Aggiungi Prestito"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
