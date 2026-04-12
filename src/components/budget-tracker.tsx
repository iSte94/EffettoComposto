"use client";

import { useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { parseBankCSV, categorizeTransaction, type BankTransaction } from "@/lib/import/bank-csv";
import { useBudget } from "@/hooks/useBudget";
import type { BudgetTransaction, BudgetViewMode } from "@/types/budget";
import { BudgetHeader } from "@/components/budget/budget-header";
import { BudgetKpiCards } from "@/components/budget/budget-kpi-cards";
import { UncategorizedAlert } from "@/components/budget/uncategorized-alert";
import { BudgetCategoriesPanel } from "@/components/budget/budget-categories-panel";
import { BudgetComparisonChart, type ComparisonRow } from "@/components/budget/budget-comparison-chart";
import { BudgetTrendChart, type TrendRow } from "@/components/budget/budget-trend-chart";
import { TransactionDrawer } from "@/components/budget/transaction-drawer";

const MONTH_LABELS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

async function hashTransaction(date: string, description: string, amount: number): Promise<string> {
    const input = `${date}|${description}|${amount.toFixed(2)}`;
    if (typeof window !== "undefined" && window.crypto?.subtle) {
        const bytes = new TextEncoder().encode(input);
        const buf = await window.crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback deterministico
    let h = 0;
    for (let i = 0; i < input.length; i++) h = ((h << 5) - h + input.charCodeAt(i)) | 0;
    return `fb_${h}_${input.length}`;
}

function formatMonthShort(month: string): string {
    const [y, m] = month.split("-").map(Number);
    return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
}

export function BudgetTracker() {
    const {
        categories,
        transactions,
        settings,
        addCategory,
        updateCategory,
        removeCategory,
        setViewMode,
        setCurrentMonth,
        importTransactions,
        updateTransactionCategory,
        deleteTransaction,
        deleteTransactionsByMonth,
        reapplyCategoryRules,
    } = useBudget();

    const [drawerCategory, setDrawerCategory] = useState<string | null>(null);

    // ---- Mesi disponibili (dal set di transazioni) ----
    const availableMonths = useMemo(() => {
        const set = new Set<string>();
        for (const t of transactions) set.add(t.date.substring(0, 7));
        return Array.from(set).sort().reverse();
    }, [transactions]);

    const viewMode: BudgetViewMode = settings.viewMode || "avg";
    const currentMonth = settings.currentMonth;

    // ---- Transazioni filtrate per periodo ----
    const filteredTransactions = useMemo(() => {
        if (viewMode === "month" && currentMonth) {
            return transactions.filter(t => t.date.startsWith(currentMonth));
        }
        return transactions;
    }, [transactions, viewMode, currentMonth]);

    // ---- Divisore per calcolo medie (per view "avg") ----
    const monthDivisor = useMemo(() => {
        if (viewMode === "avg" && availableMonths.length > 0) return availableMonths.length;
        return 1;
    }, [viewMode, availableMonths]);

    // ---- Spese per categoria (gia' normalizzate per periodo) ----
    const spendingByCategory = useMemo(() => {
        const map = new Map<string, number>();
        for (const tx of filteredTransactions) {
            if (tx.amount >= 0) continue;
            const prev = map.get(tx.category) || 0;
            map.set(tx.category, prev + Math.abs(tx.amount));
        }
        if (monthDivisor > 1) {
            for (const [k, v] of map) map.set(k, v / monthDivisor);
        }
        return map;
    }, [filteredTransactions, monthDivisor]);

    // ---- Totali ----
    const income = useMemo(() => {
        const sum = filteredTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        return monthDivisor > 1 ? sum / monthDivisor : sum;
    }, [filteredTransactions, monthDivisor]);

    const expenses = useMemo(() => {
        const sum = filteredTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        return monthDivisor > 1 ? sum / monthDivisor : sum;
    }, [filteredTransactions, monthDivisor]);

    const budgetTotal = useMemo(() => categories.reduce((s, c) => s + c.limit, 0), [categories]);

    const overBudgetCount = useMemo(() => {
        let count = 0;
        for (const cat of categories) {
            const actual = spendingByCategory.get(cat.name) || 0;
            if (actual > cat.limit && actual > 0) count++;
        }
        return count;
    }, [categories, spendingByCategory]);

    // ---- Confronto per bar chart ----
    const comparisonData: ComparisonRow[] = useMemo(() => {
        return categories.map(cat => {
            const actual = spendingByCategory.get(cat.name) || 0;
            return {
                name: cat.name,
                Budget: cat.limit,
                Speso: Math.round(actual),
                overBudget: actual > cat.limit && actual > 0,
            };
        });
    }, [categories, spendingByCategory]);

    // ---- Andamento mensile ----
    const trendData: TrendRow[] = useMemo(() => {
        const map = new Map<string, { income: number; expenses: number }>();
        for (const tx of transactions) {
            const month = tx.date.substring(0, 7);
            const entry = map.get(month) || { income: 0, expenses: 0 };
            if (tx.amount > 0) entry.income += tx.amount;
            else entry.expenses += Math.abs(tx.amount);
            map.set(month, entry);
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([month, v]) => ({
                month,
                label: formatMonthShort(month),
                Entrate: Math.round(v.income),
                Spese: Math.round(v.expenses),
                Risparmio: Math.round(v.income - v.expenses),
            }));
    }, [transactions]);

    // ---- Transazioni non categorizzate nel periodo ----
    const uncategorizedCount = useMemo(() => {
        return filteredTransactions.filter(t => t.amount < 0 && t.category === "Altro").length;
    }, [filteredTransactions]);

    // ---- Import CSV ----
    const handleImport = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const rules = categories.map(c => ({ name: c.name, keywords: c.keywords || [] }));
            const parsed = parseBankCSV(text, rules);

            if (parsed.transactions.length === 0) {
                toast.error("Nessuna transazione trovata nel file");
                return;
            }

            const enriched: BudgetTransaction[] = await Promise.all(
                parsed.transactions.map(async (t: BankTransaction) => ({
                    id: "",
                    date: t.date,
                    description: t.description,
                    amount: t.amount,
                    category: t.category || "Altro",
                    hash: await hashTransaction(t.date, t.description, t.amount),
                }))
            );

            const result = await importTransactions(enriched);
            toast.success(
                `${result.inserted} nuove transazioni · ${result.skipped} duplicate ignorate (${parsed.detectedBank})`
            );
        } catch (err) {
            console.error(err);
            toast.error("Errore durante l'import del CSV");
        }
    }, [categories, importTransactions]);

    // ---- Reset mese corrente (o tutto se in avg) ----
    const handleReset = useCallback(() => {
        const target = viewMode === "month" && currentMonth ? currentMonth : "all";
        const label = target === "all" ? "tutte le transazioni" : `le transazioni di ${target}`;
        if (!window.confirm(`Eliminare ${label}? L'operazione non e' reversibile.`)) return;
        deleteTransactionsByMonth(target);
        toast.success("Transazioni eliminate");
    }, [viewMode, currentMonth, deleteTransactionsByMonth]);

    // ---- Re-apply regole ----
    const handleReapply = useCallback(() => {
        const rules = categories.map(c => ({ name: c.name, keywords: c.keywords || [] }));
        reapplyCategoryRules((desc: string) => categorizeTransaction(desc, rules));
    }, [categories, reapplyCategoryRules]);

    // ---- Drawer per categoria ----
    const drawerTransactions = useMemo(() => {
        if (!drawerCategory) return [];
        return filteredTransactions.filter(t => t.category === drawerCategory);
    }, [filteredTransactions, drawerCategory]);

    const openDrawer = useCallback((name: string) => setDrawerCategory(name), []);
    const closeDrawer = useCallback((open: boolean) => { if (!open) setDrawerCategory(null); }, []);

    const periodLabel = viewMode === "month" && currentMonth
        ? new Date(Number(currentMonth.slice(0, 4)), Number(currentMonth.slice(5, 7)) - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
        : availableMonths.length > 1 ? `Media su ${availableMonths.length} mesi` : "Periodo";

    const hasData = filteredTransactions.length > 0;

    return (
        <div className="space-y-6">
            <BudgetHeader
                availableMonths={availableMonths}
                currentMonth={currentMonth}
                viewMode={viewMode}
                hasTransactions={transactions.length > 0}
                onViewModeChange={setViewMode}
                onMonthChange={setCurrentMonth}
                onImport={handleImport}
                onReset={handleReset}
            />

            <BudgetKpiCards
                income={income}
                expenses={expenses}
                budgetTotal={budgetTotal}
                overBudgetCount={overBudgetCount}
                totalCategories={categories.length}
                hasData={hasData}
            />

            <UncategorizedAlert
                count={uncategorizedCount}
                onOpen={() => openDrawer("Altro")}
                onReapply={handleReapply}
            />

            <BudgetCategoriesPanel
                categories={categories}
                spendingByCategory={spendingByCategory}
                hasData={hasData}
                onAdd={addCategory}
                onUpdate={updateCategory}
                onRemove={removeCategory}
                onOpenTransactions={openDrawer}
                onReapply={handleReapply}
            />

            {hasData && (
                <BudgetComparisonChart data={comparisonData} periodLabel={periodLabel} />
            )}

            <BudgetTrendChart data={trendData} budgetTotal={budgetTotal} />

            {!hasData && (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-8 text-center text-sm text-muted-foreground">
                    Importa un estratto conto CSV per iniziare a tracciare il tuo budget.
                    Le transazioni vengono salvate e categorizzate automaticamente.
                </div>
            )}

            <TransactionDrawer
                open={drawerCategory !== null}
                onOpenChange={closeDrawer}
                title={drawerCategory || ""}
                description={`${drawerTransactions.length} transazioni nel periodo selezionato`}
                transactions={drawerTransactions}
                categories={categories}
                onChangeCategory={updateTransactionCategory}
                onDelete={deleteTransaction}
            />
        </div>
    );
}
