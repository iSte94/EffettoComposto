"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, ChevronDown } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { PurchaseSimulation, FinancialSnapshot } from "@/types";

interface CalculationBreakdownProps {
    sim: PurchaseSimulation;
    snapshot: FinancialSnapshot;
    calculations: {
        loanAmount: number;
        monthlyPayment: number;
        totalInterest: number;
        totalCostOfPurchase: number;
        annualRecurringCosts: number;
        totalTCO: number;
        residualValue: number;
        opportunityCost: number;
        dtiPre: number;
        dtiPostPurchase: number;
        emergencyMonthsLeft: number;
        tcoYears: number;
        cashOutlay: number;
        liquidityAfter: number;
        wealthImpact: number;
        wealthImpactTotal: number;
        totalFinancialCommitment: number;
        realReturnForOpportunity: number;
    };
}

interface Step {
    label: string;
    formula: string;
    substituted: string;
    result: string;
}

function Block({ title, description, steps }: { title: string; description: string; steps: Step[] }) {
    return (
        <details className="group rounded-2xl border border-slate-200 bg-white/60 open:bg-white/90 dark:border-slate-700 dark:bg-slate-900/60 dark:open:bg-slate-900/90">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-left">
                <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</div>
                    <div className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{description}</div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                {steps.map((s, i) => (
                    <div key={i} className="space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</div>
                        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                            {s.formula}
                        </div>
                        <div className="rounded-lg bg-indigo-50/50 px-2.5 py-1.5 font-mono text-[11px] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                            = {s.substituted}
                        </div>
                        <div className="pl-2 font-mono text-[12px] font-bold text-emerald-600 dark:text-emerald-400">-&gt; {s.result}</div>
                    </div>
                ))}
            </div>
        </details>
    );
}

export const CalculationBreakdown = memo(function CalculationBreakdown({
    sim, snapshot, calculations: c,
}: CalculationBreakdownProps) {
    const monthlyRate = sim.financingRate / 100 / 12;
    const n = sim.financingYears * 12;
    const fireTarget = (snapshot.fireAdjustedMonthlyExpensesAtFire * 12) / (snapshot.fireWithdrawalRate / 100);
    const baselineMonthlyCoverage = Math.max(snapshot.monthlyExpenses + snapshot.existingLoansMonthlyPayment, 1);
    const hasFireAdjustment = Math.abs(snapshot.fireAdjustedMonthlyExpensesAtFire - snapshot.expectedMonthlyExpensesAtFire) > 0.01;

    const blocks: { title: string; description: string; steps: Step[] }[] = [];

    if (sim.isFinanced && c.loanAmount > 0) {
        blocks.push({
            title: "Rata mensile",
            description: "Formula ammortamento francese (rata costante)",
            steps: [
                {
                    label: "Capitale finanziato",
                    formula: "C = prezzo - anticipo",
                    substituted: `${formatEuro(sim.totalPrice)} - ${formatEuro(sim.downPayment)}`,
                    result: formatEuro(c.loanAmount),
                },
                {
                    label: "Tasso mensile",
                    formula: "i = TAN / 12",
                    substituted: `${sim.financingRate}% / 12`,
                    result: `${(monthlyRate * 100).toFixed(4)}%`,
                },
                {
                    label: "Numero rate",
                    formula: "n = anni x 12",
                    substituted: `${sim.financingYears} x 12`,
                    result: `${n} mesi`,
                },
                {
                    label: "Rata",
                    formula: "R = C x i x (1+i)^n / ((1+i)^n - 1)",
                    substituted: `${formatEuro(c.loanAmount)} x ${(monthlyRate * 100).toFixed(4)}% x ...`,
                    result: `${formatEuro(c.monthlyPayment)}/mese`,
                },
                {
                    label: "Interessi totali",
                    formula: "I = R x n - C",
                    substituted: `${formatEuro(c.monthlyPayment)} x ${n} - ${formatEuro(c.loanAmount)}`,
                    result: formatEuro(c.totalInterest),
                },
            ],
        });
    }

    blocks.push({
        title: "Costo Totale (TCO)",
        description: `Somma di tutte le uscite legate all'acquisto su ${c.tcoYears} anni`,
        steps: [
            {
                label: "Costo di acquisto",
                formula: sim.isFinanced ? "prezzo + interessi" : "prezzo",
                substituted: sim.isFinanced
                    ? `${formatEuro(sim.totalPrice)} + ${formatEuro(c.totalInterest)}`
                    : formatEuro(sim.totalPrice),
                result: formatEuro(c.totalCostOfPurchase),
            },
            {
                label: "Costi ricorrenti annui",
                formula: sim.category === "auto"
                    ? "assicurazione + manutenzione + carburante x 12"
                    : sim.category === "immobile"
                        ? "(condominio + IMU) x 12"
                        : "n/a",
                substituted: sim.category === "auto"
                    ? `${formatEuro(sim.annualInsurance)} + ${formatEuro(sim.annualMaintenance)} + ${formatEuro(sim.monthlyFuel)} x 12`
                    : sim.category === "immobile"
                        ? `(${formatEuro(sim.condominiumFees)} + ${formatEuro(sim.imuTax)}) x 12`
                        : "-",
                result: `${formatEuro(c.annualRecurringCosts)}/anno`,
            },
            {
                label: "TCO finale",
                formula: "costo acquisto + costi ricorrenti x anni",
                substituted: `${formatEuro(c.totalCostOfPurchase)} + ${formatEuro(c.annualRecurringCosts)} x ${c.tcoYears}`,
                result: formatEuro(c.totalTCO),
            },
        ],
    });

    if (sim.isFinanced) {
        blocks.push({
            title: "Debt-to-Income (DTI) post-acquisto",
            description: "Percentuale del reddito netto impegnata in rate",
            steps: [
                {
                    label: "DTI attuale (rate gia' in corso)",
                    formula: "somma rate esistenti / reddito",
                    substituted: `${formatEuro(snapshot.existingLoansMonthlyPayment)} / ${formatEuro(snapshot.monthlyIncome)}`,
                    result: `${c.dtiPre.toFixed(1)}%`,
                },
                {
                    label: "DTI post-acquisto",
                    formula: "(rate esistenti + nuova rata) / reddito",
                    substituted: `(${formatEuro(snapshot.existingLoansMonthlyPayment)} + ${formatEuro(c.monthlyPayment)}) / ${formatEuro(snapshot.monthlyIncome)}`,
                    result: `${c.dtiPostPurchase.toFixed(1)}%`,
                },
                {
                    label: "Soglia banche",
                    formula: "tipico limite bancario",
                    substituted: "33% reddito",
                    result: c.dtiPostPurchase > 33 ? "SUPERATA" : "rispettata",
                },
            ],
        });
    }

    if (snapshot.monthlyIncome > 0) {
        blocks.push({
            title: "Liquidita e fondo emergenza",
            description: "Quanto ti resta dopo l'esborso e quanti mesi copre",
            steps: [
                {
                    label: "Liquidita disponibile oggi",
                    formula: "asset liquidi + fondo emergenza",
                    substituted: `${formatEuro(snapshot.liquidAssets)} + ${formatEuro(snapshot.emergencyFund)}`,
                    result: formatEuro(snapshot.liquidAssets + snapshot.emergencyFund),
                },
                {
                    label: "Esborso immediato",
                    formula: sim.isFinanced ? "anticipo" : "prezzo pieno",
                    substituted: sim.isFinanced ? formatEuro(sim.downPayment) : formatEuro(sim.totalPrice),
                    result: formatEuro(c.cashOutlay),
                },
                {
                    label: "Liquidita residua",
                    formula: "liquidita - esborso",
                    substituted: `${formatEuro(snapshot.liquidAssets + snapshot.emergencyFund)} - ${formatEuro(c.cashOutlay)}`,
                    result: formatEuro(c.liquidityAfter),
                },
                {
                    label: "Mesi di copertura",
                    formula: "liquidita residua / spese mensili correnti",
                    substituted: `${formatEuro(Math.max(0, c.liquidityAfter))} / ${formatEuro(baselineMonthlyCoverage)}`,
                    result: `${c.emergencyMonthsLeft.toFixed(1)} mesi`,
                },
            ],
        });
    }

    blocks.push({
        title: "Costo opportunita",
        description: "Quanto produrrebbero quei soldi se investiti",
        steps: [
            {
                label: "Rendimento reale (i tuoi parametri FIRE)",
                formula: "[(1 + nominale) / (1 + inflazione)] - 1",
                substituted: `[(1 + ${snapshot.fireExpectedReturn}%) / (1 + ${snapshot.expectedInflation}%)] - 1`,
                result: `${(c.realReturnForOpportunity * 100).toFixed(2)}% reale`,
            },
            {
                label: "Valore futuro investimento",
                formula: "capitale x (1 + r)^anni",
                substituted: `${formatEuro(c.cashOutlay)} x (1 + ${(c.realReturnForOpportunity * 100).toFixed(2)}%)^${c.tcoYears}`,
                result: formatEuro(c.cashOutlay + c.opportunityCost),
            },
            {
                label: "Costo opportunita",
                formula: "valore futuro - capitale",
                substituted: `${formatEuro(c.cashOutlay + c.opportunityCost)} - ${formatEuro(c.cashOutlay)}`,
                result: formatEuro(c.opportunityCost),
            },
        ],
    });

    if (snapshot.expectedMonthlyExpensesAtFire > 0) {
        blocks.push({
            title: "Target FIRE (per riferimento)",
            description: "Quanto capitale ti serve per la tua indipendenza finanziaria con i parametri FIRE attuali",
            steps: [
                ...(hasFireAdjustment ? [{
                    label: "Spesa mensile FIRE effettiva",
                    formula: "spesa FIRE impostata - rendite/pensione future attese",
                    substituted: `${formatEuro(snapshot.expectedMonthlyExpensesAtFire)} -> ${formatEuro(snapshot.fireAdjustedMonthlyExpensesAtFire)}`,
                    result: formatEuro(snapshot.fireAdjustedMonthlyExpensesAtFire),
                }] : []),
                {
                    label: "Spesa annua attesa",
                    formula: "spesa mensile x 12",
                    substituted: `${formatEuro(snapshot.fireAdjustedMonthlyExpensesAtFire)} x 12`,
                    result: formatEuro(snapshot.fireAdjustedMonthlyExpensesAtFire * 12),
                },
                {
                    label: "Target FIRE (regola SWR)",
                    formula: "spesa annua / SWR",
                    substituted: `${formatEuro(snapshot.fireAdjustedMonthlyExpensesAtFire * 12)} / ${snapshot.fireWithdrawalRate}%`,
                    result: formatEuro(fireTarget),
                },
            ],
        });
    }

    blocks.push({
        title: "Impatto patrimoniale (investibile)",
        description: "Quanto pesa l'impegno sul patrimonio davvero mobilizzabile (esclusi immobili)",
        steps: [
            {
                label: "Impegno finanziario totale",
                formula: sim.isFinanced
                    ? "prezzo + interessi + ricorrenti x anni"
                    : "prezzo + ricorrenti x anni",
                substituted: `${formatEuro(c.totalCostOfPurchase)} + ${formatEuro(c.annualRecurringCosts)} x ${c.tcoYears}`,
                result: formatEuro(c.totalFinancialCommitment),
            },
            {
                label: "Patrimonio investibile (denominatore)",
                formula: "asset totali - immobili - debiti",
                substituted: `${formatEuro(snapshot.totalAssets)} - ${formatEuro(snapshot.realEstateValue)} - ${formatEuro(snapshot.totalDebts)}`,
                result: formatEuro(snapshot.investableNetWorth),
            },
            {
                label: "Peso sul patrimonio investibile",
                formula: "impegno / investibile x 100",
                substituted: `${formatEuro(c.totalFinancialCommitment)} / ${formatEuro(snapshot.investableNetWorth)}`,
                result: `${c.wealthImpact.toFixed(1)}%`,
            },
            {
                label: "Per riferimento: peso sul patrimonio totale",
                formula: "impegno / patrimonio netto x 100",
                substituted: `${formatEuro(c.totalFinancialCommitment)} / ${formatEuro(snapshot.netWorth)}`,
                result: `${c.wealthImpactTotal.toFixed(1)}%`,
            },
        ],
    });

    return (
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
            <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                    <div className="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-950/50">
                        <Calculator className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Come abbiamo calcolato</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Ogni numero del Consulente con formula, sostituzione e risultato
                        </p>
                    </div>
                </div>
                <div className="space-y-2">
                    {blocks.map((b, i) => (
                        <Block key={i} title={b.title} description={b.description} steps={b.steps} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
});
