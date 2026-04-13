"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Plus, Trash2, HomeIcon, CreditCard, CalendarClock, Calendar, Repeat } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { cn } from "@/lib/utils";
import type { MonthlyExpense } from "@/types";

interface FinancialProfileProps {
    person1Name: string;
    person1Income: number;
    person2Name: string;
    person2Income: number;
    expensesList: MonthlyExpense[];
    autoMonthlyRealEstateCosts: number;
    autoMonthlyLoanPayments: number;
    autoMonthlySubscriptions: number;
    totalAutoExpenses: number;
    manualExpenses: number;
    totalExpenses: number;
    grossIncome: number;
    netIncome: number;
    containerClassName?: string;
    onPerson1NameChange: (v: string) => void;
    onPerson1IncomeChange: (v: number) => void;
    onPerson2NameChange: (v: string) => void;
    onPerson2IncomeChange: (v: number) => void;
    onExpensesListChange: (v: MonthlyExpense[]) => void;
    onBlur: () => void;
}

export const FinancialProfile = memo(function FinancialProfile({
    person1Name, person1Income, person2Name, person2Income,
    expensesList, autoMonthlyRealEstateCosts, autoMonthlyLoanPayments, autoMonthlySubscriptions,
    totalAutoExpenses, manualExpenses, totalExpenses, grossIncome, netIncome,
    containerClassName,
    onPerson1NameChange, onPerson1IncomeChange, onPerson2NameChange, onPerson2IncomeChange,
    onExpensesListChange, onBlur,
}: FinancialProfileProps) {
    return (
        <div className={cn("mx-auto w-full max-w-2xl", containerClassName)}>
            <Card className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_55px_-35px_rgba(15,23,42,0.42)] sm:bg-white/90 sm:backdrop-blur-xl">
                <CardContent className="p-4 sm:p-6">
                    <div className="mb-5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-600">
                                <Wallet className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Profilo Finanziario</h3>
                                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">Entrate, Uscite e Risparmio</p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="person1-name" className="sr-only">Nome Persona 1</Label>
                            <Input id="person1-name" type="text" value={person1Name} onChange={(e) => onPerson1NameChange(e.target.value)} onBlur={onBlur} className="h-11 rounded-xl border-slate-200 bg-slate-50 text-center text-sm font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="Nome Persona 1" />
                            <Label htmlFor="person1-income" className="sr-only">Reddito Persona 1</Label>
                            <Input id="person1-income" type="number" step="100" value={person1Income} onChange={(e) => onPerson1IncomeChange(Number(e.target.value))} onBlur={onBlur} className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-center text-xl font-bold shadow-inner dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="Reddito" />
                            <p className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-400">{formatEuro(person1Income)}/mese</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="person2-name" className="sr-only">Nome Persona 2</Label>
                            <Input id="person2-name" type="text" value={person2Name} onChange={(e) => onPerson2NameChange(e.target.value)} onBlur={onBlur} className="h-11 rounded-xl border-slate-200 bg-slate-50 text-center text-sm font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="Nome Persona 2" />
                            <Label htmlFor="person2-income" className="sr-only">Reddito Persona 2</Label>
                            <Input id="person2-income" type="number" step="100" value={person2Income} onChange={(e) => onPerson2IncomeChange(Number(e.target.value))} onBlur={onBlur} className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-center text-xl font-bold shadow-inner dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" placeholder="Reddito" />
                            <p className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-400">{formatEuro(person2Income)}/mese</p>
                        </div>
                    </div>

                    <div className="mb-5 flex flex-col items-start justify-between gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Reddito Lordo Familiare</span>
                        <span className="text-lg font-black text-blue-600">{formatEuro(grossIncome)}/mese</span>
                    </div>

                    <div className="mb-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Spese Mensili Fisse</h4>
                            <Button variant="ghost" size="sm" onClick={() => { const id = Math.random().toString(36).substr(2, 9); onExpensesListChange([...expensesList, { id, name: "", amount: 0 }]); }} className="h-11 rounded-xl px-3 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950" aria-label="Aggiungi spesa">
                                <Plus className="mr-1 h-3.5 w-3.5" /> Aggiungi Spesa
                            </Button>
                        </div>
                        {expensesList.length === 0 ? (
                            <p className="py-3 text-center text-[11px] text-slate-400 dark:text-slate-400">Nessuna spesa inserita. Aggiungi le tue spese fisse mensili.</p>
                        ) : (
                            <div className="space-y-2">
                                {expensesList.map((expense, idx) => (
                                    <div key={expense.id} className="space-y-1.5">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <Input
                                                type="text"
                                                value={expense.name}
                                                aria-label={`Nome spesa ${idx + 1}`}
                                                onChange={(e) => {
                                                    const updated = [...expensesList];
                                                    updated[idx] = { ...updated[idx], name: e.target.value };
                                                    onExpensesListChange(updated);
                                                }}
                                                onBlur={onBlur}
                                                className="h-11 flex-1 rounded-xl border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800"
                                                placeholder="es. Affitto, Assicurazione auto, Conto viaggio..."
                                            />
                                            <div className="relative w-full flex-shrink-0 sm:w-28">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">€</span>
                                                <Input
                                                    type="number"
                                                    step="10"
                                                    value={expense.amount}
                                                    aria-label={`Importo spesa ${expense.name || idx + 1}`}
                                                    onChange={(e) => {
                                                        const updated = [...expensesList];
                                                        updated[idx] = { ...updated[idx], amount: Number(e.target.value) };
                                                        onExpensesListChange(updated);
                                                    }}
                                                    onBlur={onBlur}
                                                    className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-6 text-right text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const updated = [...expensesList];
                                                    updated[idx] = { ...updated[idx], isAnnual: !updated[idx].isAnnual };
                                                    onExpensesListChange(updated);
                                                    onBlur();
                                                }}
                                                title={expense.isAnnual ? "Annuale (diviso per 12)" : "Mensile"}
                                                className={`h-11 w-11 flex-shrink-0 p-0 ${expense.isAnnual ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800"}`}
                                            >
                                                {expense.isAnnual ? <CalendarClock className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const updated = expensesList.filter(e => e.id !== expense.id);
                                                    onExpensesListChange(updated);
                                                    onBlur();
                                                }}
                                                className="h-11 w-11 flex-shrink-0 p-0 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        {expense.isAnnual && expense.amount > 0 && (
                                            <p className="pl-1 text-[10px] font-medium text-amber-500 dark:text-amber-400">
                                                Annuale: {formatEuro(expense.amount)} → {formatEuro(expense.amount / 12)}/mese
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {manualExpenses > 0 && (
                            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-slate-500">
                                <span className="text-[11px] font-semibold">Subtotale spese personali</span>
                                <span className="font-bold tabular-nums">-{formatEuro(manualExpenses)}/mese</span>
                            </div>
                        )}
                    </div>

                    {totalAutoExpenses > 0 && (
                        <div className="mb-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Spese Automatiche</h4>
                            <div className="space-y-2 text-sm">
                                {autoMonthlyRealEstateCosts > 0 && (
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            <HomeIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                            Manutenzione + IMU (annuale / 12)
                                        </span>
                                        <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">-{formatEuro(autoMonthlyRealEstateCosts)}/mese</span>
                                    </div>
                                )}
                                {autoMonthlyLoanPayments > 0 && (
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            <CreditCard className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                            Rate prestiti / mutui
                                        </span>
                                        <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">-{formatEuro(autoMonthlyLoanPayments)}/mese</span>
                                    </div>
                                )}
                                {autoMonthlySubscriptions > 0 && (
                                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            <Repeat className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                            Abbonamenti ricorrenti
                                        </span>
                                        <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">-{formatEuro(autoMonthlySubscriptions)}/mese</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Totale Spese</span>
                        <span className="text-lg font-black tabular-nums text-rose-500">-{formatEuro(totalExpenses)}/mese</span>
                    </div>

                    <div className={`flex flex-col items-start justify-between gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:gap-3 ${netIncome >= 0 ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
                        <div>
                            <div className="flex items-center gap-1">
                                <span className={`text-xs font-bold uppercase tracking-wider ${netIncome >= 0 ? "text-emerald-700" : "text-rose-700"}`}>Risparmio Mensile Netto</span>
                                <InfoTooltip>Reddito lordo familiare meno tutte le spese: personali, costi immobili (IMU + manutenzione), rate prestiti e mutui. Questo valore viene usato nella proiezione patrimonio e nel calcolo FIRE.</InfoTooltip>
                            </div>
                        </div>
                        <span className={`text-2xl font-black tabular-nums ${netIncome >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatEuro(netIncome)}/mese</span>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
});
