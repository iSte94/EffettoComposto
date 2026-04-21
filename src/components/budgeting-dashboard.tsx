"use client";

import { BudgetTracker } from "@/components/budget-tracker";
import { PlannedEventsManager } from "@/components/planned-events-manager";
import { SubscriptionTracker } from "@/components/subscription-tracker";
import { SavingsGoals } from "@/components/savings-goals";
import { Wallet } from "lucide-react";

interface BudgetingDashboardProps {
    user?: { username: string } | null;
}

export function BudgetingDashboard({ user = null }: BudgetingDashboardProps) {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-3 pb-4">
                <div className="inline-flex items-center gap-3 px-4 sm:px-5 py-2.5 bg-violet-50/80 dark:bg-violet-950/35 border border-violet-200/80 dark:border-violet-900/70 rounded-2xl shadow-sm">
                    <Wallet className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Budgeting</h2>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">Gestisci il tuo budget mensile e traccia gli abbonamenti ricorrenti.</p>
            </div>

            <PlannedEventsManager user={user} />
            <SavingsGoals user={user} />
            <BudgetTracker />
            <SubscriptionTracker />
        </div>
    );
}
