"use client";

import { useMemo } from "react";
import { AlertTriangle, TrendingDown, Target, ShieldCheck, Flame, Clock } from "lucide-react";

export interface FinancialData {
    netWorth?: number;
    monthlyIncome?: number;
    monthlyInstallment?: number;
    emergencyFund?: number;
    monthlyExpenses?: number;
    savingsGoals?: { name: string; currentAmount: number; targetAmount: number; deadline: string | null }[];
    fireTarget?: number;
    fireProgress?: number;
}

interface Alert {
    id: string;
    severity: "danger" | "warning" | "success";
    icon: React.ReactNode;
    title: string;
    message: string;
}

export function useFinancialAlerts(data: FinancialData): Alert[] {
    return useMemo(() => {
        const alerts: Alert[] = [];
        const { netWorth, monthlyIncome, monthlyInstallment, emergencyFund, monthlyExpenses, savingsGoals, fireTarget, fireProgress } = data;

        // DTI Alert
        if (monthlyIncome && monthlyIncome > 0 && monthlyInstallment && monthlyInstallment > 0) {
            const dti = monthlyInstallment / monthlyIncome;
            if (dti > 0.40) {
                alerts.push({
                    id: "dti-danger",
                    severity: "danger",
                    icon: <AlertTriangle className="w-4 h-4" />,
                    title: "Rapporto rata/reddito critico",
                    message: `Il tuo DTI e' al ${(dti * 100).toFixed(0)}%. Sopra il 40% rischi seri problemi di liquidita'.`,
                });
            } else if (dti > 0.33) {
                alerts.push({
                    id: "dti-warning",
                    severity: "warning",
                    icon: <AlertTriangle className="w-4 h-4" />,
                    title: "Rapporto rata/reddito elevato",
                    message: `Il tuo DTI e' al ${(dti * 100).toFixed(0)}%. La soglia consigliata e' 33%.`,
                });
            }
        }

        // Emergency Fund Alert (runway)
        if (emergencyFund !== undefined && monthlyExpenses && monthlyExpenses > 0) {
            const months = emergencyFund / monthlyExpenses;
            if (months < 3) {
                alerts.push({
                    id: "emergency-danger",
                    severity: "danger",
                    icon: <ShieldCheck className="w-4 h-4" />,
                    title: "Fondo emergenza insufficiente",
                    message: `Solo ${months.toFixed(1)} mesi di copertura. Il minimo consigliato e' 3-6 mesi.`,
                });
            } else if (months < 6) {
                alerts.push({
                    id: "emergency-warning",
                    severity: "warning",
                    icon: <ShieldCheck className="w-4 h-4" />,
                    title: "Fondo emergenza sotto la soglia",
                    message: `${months.toFixed(1)} mesi di copertura. Considera di portarlo a 6 mesi.`,
                });
            } else if (months >= 12) {
                alerts.push({
                    id: "emergency-good",
                    severity: "success",
                    icon: <ShieldCheck className="w-4 h-4" />,
                    title: "Fondo emergenza eccellente",
                    message: `${months.toFixed(0)} mesi di copertura. Ottima sicurezza finanziaria.`,
                });
            }
        }

        // Savings Goals Deadline Alert
        if (savingsGoals && savingsGoals.length > 0) {
            const now = new Date();
            for (const goal of savingsGoals) {
                if (!goal.deadline || goal.currentAmount >= goal.targetAmount) continue;
                const deadlineDate = new Date(goal.deadline + "-01");
                const monthsLeft = (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth());
                const remaining = goal.targetAmount - goal.currentAmount;
                const progress = (goal.currentAmount / goal.targetAmount) * 100;

                if (monthsLeft <= 0) {
                    alerts.push({
                        id: `goal-expired-${goal.name}`,
                        severity: "danger",
                        icon: <Target className="w-4 h-4" />,
                        title: `Obiettivo "${goal.name}" scaduto`,
                        message: `Mancano ancora €${remaining.toLocaleString('it-IT')} (${progress.toFixed(0)}% completato).`,
                    });
                } else if (monthsLeft <= 3) {
                    alerts.push({
                        id: `goal-urgent-${goal.name}`,
                        severity: "warning",
                        icon: <Clock className="w-4 h-4" />,
                        title: `Obiettivo "${goal.name}" in scadenza`,
                        message: `${monthsLeft} mesi rimanenti, serve €${Math.round(remaining / monthsLeft).toLocaleString('it-IT')}/mese per raggiungerlo.`,
                    });
                }
            }
        }

        // FIRE Progress Milestone
        if (fireTarget && fireTarget > 0 && fireProgress !== undefined) {
            if (fireProgress >= 100) {
                alerts.push({
                    id: "fire-reached",
                    severity: "success",
                    icon: <Flame className="w-4 h-4" />,
                    title: "Obiettivo FIRE raggiunto!",
                    message: "Congratulazioni! Hai raggiunto il tuo target di indipendenza finanziaria.",
                });
            } else if (fireProgress >= 75) {
                alerts.push({
                    id: "fire-close",
                    severity: "success",
                    icon: <Flame className="w-4 h-4" />,
                    title: `FIRE al ${fireProgress.toFixed(0)}%`,
                    message: "Sei sulla buona strada! Manca poco al traguardo.",
                });
            }
        }

        // Negative Net Worth
        if (netWorth !== undefined && netWorth < 0) {
            alerts.push({
                id: "negative-nw",
                severity: "danger",
                icon: <TrendingDown className="w-4 h-4" />,
                title: "Patrimonio netto negativo",
                message: "I tuoi debiti superano i tuoi asset. Prioritizza la riduzione del debito.",
            });
        }

        return alerts;
    }, [data]);
}

const SEVERITY_STYLES = {
    danger: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
    warning: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
    success: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
};

const ICON_STYLES = {
    danger: "text-red-500",
    warning: "text-amber-500",
    success: "text-emerald-500",
};

export function FinancialAlerts({ data }: { data: FinancialData }) {
    const alerts = useFinancialAlerts(data);

    if (alerts.length === 0) return null;

    return (
        <div className="space-y-2">
            {alerts.map(alert => (
                <div key={alert.id} className={`flex items-start gap-3 border rounded-xl p-3 ${SEVERITY_STYLES[alert.severity]}`}>
                    <div className={`mt-0.5 shrink-0 ${ICON_STYLES[alert.severity]}`}>{alert.icon}</div>
                    <div>
                        <p className="text-sm font-bold">{alert.title}</p>
                        <p className="text-xs opacity-80">{alert.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
