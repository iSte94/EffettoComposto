"use client";

import { memo, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
    computeSavingsOpportunity,
    DEFAULT_SAVINGS_OPPORTUNITY_HORIZON_YEARS,
    DEFAULT_SAVINGS_OPPORTUNITY_REAL_RETURN_PCT,
} from "@/lib/finance/savings-opportunity";

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

    // Costo opportunita' composto del risparmio mensile: traduce il surplus
    // mensile (entrate - uscite) nel capitale FIRE-grade che accumuleresti
    // investendo la stessa cifra al rendimento reale di default per
    // l'orizzonte di default. Solo quando hasData e savings > 0: in negativo
    // o pareggio nessun "surplus investibile" da proiettare.
    const opportunity = useMemo(
        () => (hasData ? computeSavingsOpportunity({ monthlySavings: savings }) : null),
        [hasData, savings],
    );

    return (
        <div className="space-y-4">
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

            {opportunity && (
                <div
                    className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/70 p-4 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/20"
                    title={`Investendo ${formatEuro(opportunity.monthlySavings)}/mese al ${opportunity.realReturnPct}% reale annuo per ${opportunity.years} anni accumuleresti ${formatEuro(opportunity.futureValueReal)} in potere d'acquisto odierno (di cui ${formatEuro(opportunity.compoundGain)} di soli interessi composti).`}
                >
                    <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="h-3 w-3" /> Costo Opportunita&apos; del Risparmio a {DEFAULT_SAVINGS_OPPORTUNITY_HORIZON_YEARS} Anni
                        <InfoTooltip iconClassName="w-3 h-3">
                            Il surplus mensile (entrate - uscite) investito al {DEFAULT_SAVINGS_OPPORTUNITY_REAL_RETURN_PCT}% reale annuo per {DEFAULT_SAVINGS_OPPORTUNITY_HORIZON_YEARS} anni, capitalizzazione mensile. Valore in potere d&apos;acquisto odierno (al netto dell&apos;inflazione), confrontabile direttamente con il capitale FIRE. E&apos; il ponte fra il budget mensile e l&apos;indipendenza finanziaria: mantenere oggi questo ritmo di risparmio significa accumulare questo capitale domani.
                        </InfoTooltip>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                            {formatEuro(opportunity.futureValueReal)}
                        </div>
                        <div className="mt-0.5 text-[10px] text-emerald-600/80 dark:text-emerald-400/70">
                            {formatEuro(opportunity.monthlySavings)}/mese al {opportunity.realReturnPct}% reale per {opportunity.years} anni
                        </div>
                        {opportunity.compoundGain > 0 && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                                di cui {formatEuro(opportunity.compoundGain)} di soli interessi composti
                                <span className="mx-1">·</span>
                                versato in totale: {formatEuro(opportunity.totalContributed)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export const BudgetKpiCards = memo(BudgetKpiCardsComponent);
