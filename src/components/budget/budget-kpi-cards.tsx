"use client";

import { memo } from "react";
import { formatEuro } from "@/lib/format";

interface BudgetKpiCardsProps {
    income: number;
    expenses: number;
    budgetTotal: number;
    overBudgetCount: number;
    totalCategories: number;
    hasData: boolean;
}

function BudgetKpiCardsComponent({
    income,
    expenses,
    budgetTotal,
    overBudgetCount,
    totalCategories,
    hasData,
}: BudgetKpiCardsProps) {
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : null;
    const overExpenses = expenses > budgetTotal;

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">Entrate</p>
                <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {hasData ? formatEuro(income) : "—"}
                </p>
                <p className="text-[10px] text-emerald-500/70">periodo selezionato</p>
            </div>

            <div className={`rounded-3xl border p-4 ${overExpenses
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                : "border-violet-200 bg-violet-50/90 dark:border-violet-800 dark:bg-violet-950/30"}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Spese {overExpenses ? "(oltre budget)" : ""}
                </p>
                <p className={`mt-1 text-xl font-extrabold ${overExpenses ? "text-red-600" : "text-violet-600 dark:text-violet-400"}`}>
                    {hasData ? formatEuro(expenses) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">/ budget {formatEuro(budgetTotal)}</p>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card/80 p-4 backdrop-blur-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tasso Risparmio</p>
                <p className={`mt-1 text-xl font-extrabold ${savingsRate === null
                    ? "text-muted-foreground"
                    : savingsRate >= 20 ? "text-emerald-600" : savingsRate >= 0 ? "text-amber-500" : "text-red-500"}`}>
                    {savingsRate === null ? "—" : `${savingsRate.toFixed(1)}%`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                    {hasData && savingsRate !== null ? formatEuro(savings) : "nessuna entrata"}
                </p>
            </div>

            <div className="rounded-3xl border border-border/70 bg-muted/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categorie Oltre</p>
                <p className="mt-1 text-xl font-extrabold text-foreground">
                    {hasData ? overBudgetCount : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">su {totalCategories}</p>
            </div>
        </div>
    );
}

export const BudgetKpiCards = memo(BudgetKpiCardsComponent);
