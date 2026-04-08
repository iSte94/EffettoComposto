"use client";

import { BudgetTracker } from "@/components/budget-tracker";
import { SubscriptionTracker } from "@/components/subscription-tracker";
import { SavingsGoals } from "@/components/savings-goals";
import { Wallet } from "lucide-react";

interface BudgetingDashboardProps {
    user?: { username: string } | null;
}

export function BudgetingDashboard({ user = null }: BudgetingDashboardProps) {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-2 pb-4">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-900 rounded-2xl shadow-sm">
                    <Wallet className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Budgeting</h2>
                </div>
                <p className="text-sm text-slate-500">Gestisci il tuo budget mensile e traccia gli abbonamenti ricorrenti.</p>
            </div>

            <SavingsGoals user={user} />
            <BudgetTracker />
            <SubscriptionTracker />
        </div>
    );
}
