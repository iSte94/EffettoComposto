import { useState, useEffect, useMemo } from "react";
import type { AssetRecord } from "@/types";

export interface HeaderKpis {
    netWorth: number;
    netWorthChange: number;
    fireProgress: number;
    fireTarget: number;
    savingsRate: number | null; // null = dati insufficienti
}

export function useHeaderKpis(user: { username: string } | null) {
    const [history, setHistory] = useState<AssetRecord[]>([]);
    const [preferences, setPreferences] = useState<Record<string, number | string | null>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { setLoading(false); return; }

        Promise.all([
            fetch("/api/patrimonio").then(r => r.json()),
            fetch("/api/preferences").then(r => r.json()),
        ]).then(([patrimonioData, prefData]) => {
            if (patrimonioData.history) {
                const enriched = patrimonioData.history.map((item: AssetRecord) => ({
                    ...item,
                    totalNetWorth: (item.liquidStockValue || 0) + (item.stocksSnapshotValue || 0) +
                        (item.safeHavens || 0) + (item.emergencyFund || 0) + (item.pensionFund || 0) +
                        ((item.bitcoinAmount || 0) * (item.bitcoinPrice || 0)) - (item.debtsTotal || 0),
                }));
                setHistory(enriched);
            }
            if (prefData.preferences) setPreferences(prefData.preferences);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, [user]);

    const kpis = useMemo<HeaderKpis | null>(() => {
        if (history.length === 0) return null;

        const latest = history[history.length - 1];
        const previous = history.length >= 2 ? history[history.length - 2] : null;
        const currentNetWorth = latest.totalNetWorth || 0;
        const previousNetWorth = previous?.totalNetWorth || currentNetWorth;

        // FIRE
        const fireWithdrawalRate = Number(preferences.fireWithdrawalRate) || 3.25;
        const expectedMonthlyExpenses = Number(preferences.expectedMonthlyExpenses) || 0;
        const fireTarget = expectedMonthlyExpenses > 0
            ? (expectedMonthlyExpenses * 12) / (fireWithdrawalRate / 100)
            : 0;
        const fireProgress = fireTarget > 0 ? Math.min(100, (currentNetWorth / fireTarget) * 100) : 0;

        // Savings rate
        const grossIncome = Number(preferences.person1Income || 0) + Number(preferences.person2Income || 0);
        let savingsRate: number | null = null;
        if (grossIncome > 0) {
            let manualExpenses = 0;
            try {
                const list = JSON.parse(String(preferences.expensesList || "[]"));
                manualExpenses = list.reduce((acc: number, e: { amount?: number }) => acc + (e.amount || 0), 0);
            } catch { /* empty */ }

            let realEstateMonthlyCosts = 0;
            try {
                const reList = JSON.parse(String(preferences.realEstateList || "[]"));
                const annualCosts = reList.reduce((acc: number, p: { costs?: number; imu?: number; isPrimaryResidence?: boolean }) => {
                    return acc + (p.costs || 0) + (!p.isPrimaryResidence ? (p.imu || 0) : 0);
                }, 0);
                realEstateMonthlyCosts = annualCosts / 12;
            } catch { /* empty */ }

            let monthlyLoanPayments = 0;
            try {
                const loans = JSON.parse(String(preferences.existingLoansList || "[]"));
                const now = new Date();
                for (const loan of loans) {
                    const end = new Date(loan.endDate + "-01");
                    if (end > now) monthlyLoanPayments += loan.installment || 0;
                }
            } catch { /* empty */ }

            const monthlySavings = grossIncome - manualExpenses - realEstateMonthlyCosts - monthlyLoanPayments;
            savingsRate = Math.round((monthlySavings / grossIncome) * 100);
        }

        return {
            netWorth: currentNetWorth,
            netWorthChange: currentNetWorth - previousNetWorth,
            fireProgress,
            fireTarget,
            savingsRate,
        };
    }, [history, preferences]);

    return { kpis, loading };
}
