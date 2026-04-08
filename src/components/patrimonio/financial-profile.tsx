"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Plus, Trash2, HomeIcon, CreditCard, CalendarClock, Calendar } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { MonthlyExpense } from "@/types";

interface FinancialProfileProps {
    person1Name: string;
    person1Income: number;
    person2Name: string;
    person2Income: number;
    expensesList: MonthlyExpense[];
    autoMonthlyRealEstateCosts: number;
    autoMonthlyLoanPayments: number;
    totalAutoExpenses: number;
    manualExpenses: number;
    totalExpenses: number;
    grossIncome: number;
    netIncome: number;
    onPerson1NameChange: (v: string) => void;
    onPerson1IncomeChange: (v: number) => void;
    onPerson2NameChange: (v: string) => void;
    onPerson2IncomeChange: (v: number) => void;
    onExpensesListChange: (v: MonthlyExpense[]) => void;
    onBlur: () => void;
}

export const FinancialProfile = memo(function FinancialProfile({
    person1Name, person1Income, person2Name, person2Income,
    expensesList, autoMonthlyRealEstateCosts, autoMonthlyLoanPayments,
    totalAutoExpenses, manualExpenses, totalExpenses, grossIncome, netIncome,
    onPerson1NameChange, onPerson1IncomeChange, onPerson2NameChange, onPerson2IncomeChange,
    onExpensesListChange, onBlur,
}: FinancialProfileProps) {
    return (
        <div className="max-w-2xl mx-auto">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-blue-600 dark:text-blue-400">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Profilo Finanziario</h3>
                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-widest">Entrate, Uscite e Risparmio</p>
                            </div>
                        </div>
                    </div>

                    {/* Redditi */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="space-y-2">
                            <Label htmlFor="person1-name" className="sr-only">Nome Persona 1</Label>
                            <Input id="person1-name" type="text" value={person1Name}
                                onChange={(e) => onPerson1NameChange(e.target.value)} onBlur={onBlur}
                                className="h-9 text-center text-sm font-semibold bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl focus-visible:ring-blue-500"
                                placeholder="Nome Persona 1" />
                            <Label htmlFor="person1-income" className="sr-only">Reddito Persona 1</Label>
                            <Input id="person1-income" type="number" step="100" value={person1Income}
                                onChange={(e) => onPerson1IncomeChange(Number(e.target.value))} onBlur={onBlur}
                                className="h-12 text-center font-bold text-xl bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-2xl focus-visible:ring-blue-500 shadow-inner"
                                placeholder="Reddito" />
                            <p className="text-[10px] text-slate-400 dark:text-slate-400 text-center font-medium">{formatEuro(person1Income)}/mese</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="person2-name" className="sr-only">Nome Persona 2</Label>
                            <Input id="person2-name" type="text" value={person2Name}
                                onChange={(e) => onPerson2NameChange(e.target.value)} onBlur={onBlur}
                                className="h-9 text-center text-sm font-semibold bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl focus-visible:ring-blue-500"
                                placeholder="Nome Persona 2" />
                            <Label htmlFor="person2-income" className="sr-only">Reddito Persona 2</Label>
                            <Input id="person2-income" type="number" step="100" value={person2Income}
                                onChange={(e) => onPerson2IncomeChange(Number(e.target.value))} onBlur={onBlur}
                                className="h-12 text-center font-bold text-xl bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-2xl focus-visible:ring-blue-500 shadow-inner"
                                placeholder="Reddito" />
                            <p className="text-[10px] text-slate-400 dark:text-slate-400 text-center font-medium">{formatEuro(person2Income)}/mese</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl mb-5">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Reddito Lordo Familiare</span>
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400">{formatEuro(grossIncome)}/mese</span>
                    </div>

                    {/* Spese */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Spese Mensili Fisse</h4>
                            <Button variant="ghost" size="sm"
                                onClick={() => {
                                    const id = Math.random().toString(36).substr(2, 9);
                                    onExpensesListChange([...expensesList, { id, name: "", amount: 0 }]);
                                }}
                                className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950">
                                <Plus className="w-3.5 h-3.5 mr-1" /> Aggiungi Spesa
                            </Button>
                        </div>
                        {expensesList.length === 0 ? (
                            <p className="text-[11px] text-slate-400 dark:text-slate-400 text-center py-3">Nessuna spesa inserita. Aggiungi le tue spese fisse mensili.</p>
                        ) : (
                            <div className="space-y-2">
                                {expensesList.map((expense, idx) => (
                                    <div key={expense.id} className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Input type="text" value={expense.name} aria-label={`Nome spesa ${idx + 1}`}
                                                onChange={(e) => {
                                                    const updated = [...expensesList];
                                                    updated[idx] = { ...updated[idx], name: e.target.value };
                                                    onExpensesListChange(updated);
                                                }}
                                                onBlur={onBlur}
                                                className="h-9 text-sm bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl flex-1"
                                                placeholder="es. Affitto, Assicurazione auto, Conto viaggio..." />
                                            <div className="relative w-28 flex-shrink-0">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">€</span>
                                                <Input type="number" step="10" value={expense.amount}
                                                    aria-label={`Importo spesa ${expense.name || idx + 1}`}
                                                    onChange={(e) => {
                                                        const updated = [...expensesList];
                                                        updated[idx] = { ...updated[idx], amount: Number(e.target.value) };
                                                        onExpensesListChange(updated);
                                                    }}
                                                    onBlur={onBlur}
                                                    className="h-9 pl-6 text-sm font-bold text-right bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-xl" />
                                            </div>
                                            <Button variant="ghost" size="sm"
                                                onClick={() => {
                                                    const updated = [...expensesList];
                                                    updated[idx] = { ...updated[idx], isAnnual: !updated[idx].isAnnual };
                                                    onExpensesListChange(updated);
                                                    onBlur();
                                                }}
                                                title={expense.isAnnual ? "Annuale (diviso per 12)" : "Mensile"}
                                                className={`h-9 w-9 p-0 flex-shrink-0 ${expense.isAnnual
                                                    ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950'
                                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                                {expense.isAnnual ? <CalendarClock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                                            </Button>
                                            <Button variant="ghost" size="sm"
                                                onClick={() => {
                                                    const updated = expensesList.filter(e => e.id !== expense.id);
                                                    onExpensesListChange(updated);
                                                    onBlur();
                                                }}
                                                className="h-9 w-9 p-0 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 flex-shrink-0">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        {expense.isAnnual && expense.amount > 0 && (
                                            <p className="text-[10px] text-amber-500 dark:text-amber-400 pl-1 font-medium">
                                                Annuale: {formatEuro(expense.amount)} → {formatEuro(expense.amount / 12)}/mese
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {manualExpenses > 0 && (
                            <div className="flex items-center justify-between py-1.5 px-3 text-slate-500 mt-2">
                                <span className="text-[11px] font-semibold">Subtotale spese personali</span>
                                <span className="text-sm font-bold tabular-nums">-{formatEuro(manualExpenses)}/mese</span>
                            </div>
                        )}
                    </div>

                    {/* Spese Automatiche */}
                    {totalAutoExpenses > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mb-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Spese Automatiche (da Immobili e Prestiti)</h4>
                            <div className="space-y-1.5 text-sm">
                                {autoMonthlyRealEstateCosts > 0 && (
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                            <HomeIcon className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                            Manutenzione + IMU (annuale / 12)
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">-{formatEuro(autoMonthlyRealEstateCosts)}/mese</span>
                                    </div>
                                )}
                                {autoMonthlyLoanPayments > 0 && (
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                            <CreditCard className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                                            Rate prestiti / mutui
                                        </span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">-{formatEuro(autoMonthlyLoanPayments)}/mese</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Totale Spese */}
                    <div className="flex items-center justify-between py-2 px-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl mb-4">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Totale Spese</span>
                        <span className="text-lg font-black text-rose-500 tabular-nums">-{formatEuro(totalExpenses)}/mese</span>
                    </div>

                    {/* Risparmio Netto */}
                    <div className={`flex items-center justify-between py-3 px-4 rounded-xl ${netIncome >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-rose-50 dark:bg-rose-950/50'}`}>
                        <div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${netIncome >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>Risparmio Mensile Netto</span>
                            <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">Reddito familiare - spese personali - immobili - prestiti</p>
                        </div>
                        <span className={`text-2xl font-black tabular-nums ${netIncome >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatEuro(netIncome)}/mese</span>
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-slate-400 text-center font-medium mt-3">Sincronizzato con il simulatore mutuo e l&apos;indice di sopravvivenza.</p>
                </CardContent>
            </Card>
        </div>
    );
});
