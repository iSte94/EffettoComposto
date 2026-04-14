"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck, CreditCard, TrendingDown, TrendingUp,
  AlertTriangle, Loader2, PiggyBank, Target,
  Wallet, BadgePercent, Clock, Scale, Lightbulb,
  CircleDollarSign, Home
} from "lucide-react";

import { formatEuro } from "@/lib/format";
import type { FinancialSnapshot, PurchaseSimulation, Advice, AcceptedPurchase, ExistingLoan, MonthlyExpense } from "@/types";
import { PurchaseForm } from "@/components/advisor/purchase-form";
import { AdvicePanel } from "@/components/advisor/advice-panel";
import { PurchaseImpactChart } from "@/components/advisor/purchase-impact-chart";
import { FireImpactChart } from "@/components/advisor/fire-impact-chart";
import { CalculationBreakdown } from "@/components/advisor/calculation-breakdown";
import { ScenarioComparison } from "@/components/advisor/scenario-comparison";
import { SensitivityChart } from "@/components/advisor/sensitivity-chart";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar } from "lucide-react";
import { getInstallmentAmountForMonth } from "@/lib/finance/loans";
import { projectFire } from "@/lib/finance/fire-projection";
import { toast } from "sonner";

interface AdvisorDashboardProps {
  user: { username: string } | null;
}

const defaultSimulation: PurchaseSimulation = {
  category: "auto",
  itemName: "",
  totalPrice: 25000,
  downPayment: 5000,
  financingRate: 5.5,
  financingYears: 5,
  isFinanced: true,
  annualInsurance: 800,
  annualMaintenance: 500,
  monthlyFuel: 150,
  depreciationRate: 20,
  monthlyRent: 0,
  condominiumFees: 100,
  imuTax: 200,
  usefulLifeYears: 10,
};

function formatMonthsCoverage(months: number): string {
  if (!Number.isFinite(months) || months < 0) return "0.0 mesi";
  if (months > 24) return "oltre 24 mesi (abbondante)";
  return `${months.toFixed(1)} mesi`;
}

export function AdvisorDashboard({ user }: AdvisorDashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot>({
    totalAssets: 0, totalDebts: 0, netWorth: 0, liquidAssets: 0,
    emergencyFund: 0, monthlyIncome: 0, realEstateValue: 0,
    investableAssets: 0, investableNetWorth: 0,
    monthlyExpenses: 0, monthlySavings: 0, existingLoansMonthlyPayment: 0, currentDTI: 0,
    existingLoansCount: 0,
    birthYear: null, currentAge: null, retirementAge: 60,
    expectedMonthlyExpensesAtFire: 2500,
    fireWithdrawalRate: 3.25, fireExpectedReturn: 6, expectedInflation: 2,
  });
  const [sim, setSim] = useState<PurchaseSimulation>(defaultSimulation);
  const [showResults, setShowResults] = useState(false);
  const [acceptedPurchases, setAcceptedPurchases] = useState<AcceptedPurchase[]>([]);
  const [existingLoans, setExistingLoans] = useState<ExistingLoan[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Carica dati patrimoniali dell'utente
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const loadData = async () => {
      try {
        const [prefRes, patrimonioRes] = await Promise.all([
          fetch("/api/preferences"),
          fetch("/api/patrimonio"),
        ]);
        const prefData = await prefRes.json();
        const patrimonioData = await patrimonioRes.json();

        let liquidAssets = 0;
        let emergencyFund = 0;
        let realEstateValue = 0;
        let totalDebts = 0;
        let totalAssets = 0;

        const history = patrimonioData.history || patrimonioData.records || [];
        if (history.length > 0) {
          const latest = history[history.length - 1];
          liquidAssets = (latest.liquidStockValue || 0) + (latest.stocksSnapshotValue || 0) + (latest.bitcoinAmount || 0) * (latest.bitcoinPrice || 0);
          emergencyFund = latest.emergencyFund || 0;
          realEstateValue = latest.realEstateValue || 0;
          totalDebts = latest.debtsTotal || 0;
          const safeHavens = latest.safeHavens || 0;
          const pensionFund = latest.pensionFund || 0;
          totalAssets = liquidAssets + safeHavens + emergencyFund + pensionFund + realEstateValue;
        }

        const p = prefData.preferences || {};
        const monthlyIncome = Number(p.netIncome) || 0;

        // Carica prestiti esistenti
        let loans: ExistingLoan[] = [];
        if (p.existingLoansList) {
          try { loans = JSON.parse(p.existingLoansList); } catch { /* empty */ }
        }
        setExistingLoans(loans);
        if (p.acceptedPurchases) {
          try { setAcceptedPurchases(JSON.parse(p.acceptedPurchases)); } catch { /* empty */ }
        }

        // Spese mensili reali da expensesList (isAnnual => /12)
        let monthlyExpenses = 0;
        if (p.expensesList) {
          try {
            const list: MonthlyExpense[] = JSON.parse(p.expensesList);
            monthlyExpenses = list.reduce((acc, e) => acc + ((Number(e.amount) || 0) / (e.isAnnual ? 12 : 1)), 0);
          } catch { /* empty */ }
        }

        // Rata mensile totale prestiti esistenti (oggi, mese 0)
        const now = new Date();
        let existingLoansMonthlyPayment = 0;
        loans.forEach(loan => {
          if (!loan.startDate || !loan.endDate) return;
          const start = new Date(loan.startDate + "-01");
          const end = new Date(loan.endDate + "-01");
          if (now < start || now >= end) return;
          const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
          const currentMonthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
          existingLoansMonthlyPayment += getInstallmentAmountForMonth(loan, currentMonthsPassed, totalMonths, currentMonthsPassed);
        });

        const monthlySavings = Math.max(0, monthlyIncome - monthlyExpenses - existingLoansMonthlyPayment);
        const currentDTI = monthlyIncome > 0 ? existingLoansMonthlyPayment / monthlyIncome : 0;

        // FIRE context
        const birthYear: number | null = p.birthYear ?? null;
        const currentAge = birthYear ? new Date().getFullYear() - birthYear : null;
        const retirementAge = Number(p.retirementAge) || 60;
        const expectedMonthlyExpensesAtFire = Number(p.expectedMonthlyExpenses) || Math.max(monthlyExpenses, 1500);
        const fireWithdrawalRate = Number(p.fireWithdrawalRate) || 3.25;
        const fireExpectedReturn = Number(p.fireExpectedReturn) || 6;
        const expectedInflation = p.expectedInflation !== undefined ? Number(p.expectedInflation) : 2;

        const investableAssets = Math.max(0, totalAssets - realEstateValue);
        const investableNetWorth = investableAssets - totalDebts;

        setSnapshot({
          totalAssets,
          totalDebts,
          netWorth: totalAssets - totalDebts,
          liquidAssets,
          emergencyFund,
          monthlyIncome,
          realEstateValue,
          investableAssets,
          investableNetWorth,
          monthlyExpenses,
          monthlySavings,
          existingLoansMonthlyPayment,
          currentDTI,
          existingLoansCount: loans.length,
          birthYear,
          currentAge,
          retirementAge,
          expectedMonthlyExpensesAtFire,
          fireWithdrawalRate,
          fireExpectedReturn,
          expectedInflation,
        });
      } catch (e) {
        console.error("Errore caricamento dati:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  const updateSim = (updates: Partial<PurchaseSimulation>) => {
    setSim(prev => ({ ...prev, ...updates }));
    setShowResults(false);
  };

  const handleAcceptPurchase = async () => {
    if (!user) return toast.error("Devi accedere per accettare una spesa");
    setIsAccepting(true);
    try {
      const loanId = `purchase-${Date.now()}`;
      const now = new Date();
      const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const endDate = sim.isFinanced
        ? `${now.getFullYear() + sim.financingYears}-${String(now.getMonth() + 1).padStart(2, '0')}`
        : startDate;

      const categoryMap: Record<string, "Auto" | "Casa" | "Personale" | "Arredamento" | "Altro"> = {
        auto: "Auto", immobile: "Casa", arredamento: "Arredamento", altro: "Altro",
      };

      // Crea il prestito se finanziato
      let updatedLoans = [...existingLoans];
      if (sim.isFinanced && calculations.monthlyPayment > 0) {
        const newLoan: ExistingLoan = {
          id: loanId,
          name: sim.itemName || `${categoryMap[sim.category]} - Acquisto`,
          category: categoryMap[sim.category],
          installment: Math.round(calculations.monthlyPayment * 100) / 100,
          startDate,
          endDate,
          originalAmount: sim.totalPrice - sim.downPayment,
          interestRate: sim.financingRate,
          currentRemainingDebt: sim.totalPrice - sim.downPayment,
        };
        updatedLoans = [...updatedLoans, newLoan];
      }

      // Crea l'acquisto accettato
      const newPurchase: AcceptedPurchase = {
        id: loanId,
        acceptedAt: now.toISOString(),
        category: sim.category,
        itemName: sim.itemName || categoryMap[sim.category],
        totalPrice: sim.totalPrice,
        downPayment: sim.downPayment,
        isFinanced: sim.isFinanced,
        financingRate: sim.financingRate,
        financingYears: sim.financingYears,
        monthlyPayment: calculations.monthlyPayment,
        totalInterest: calculations.totalInterest,
        totalTCO: calculations.totalTCO,
        linkedLoanId: sim.isFinanced ? loanId : undefined,
      };
      const updatedPurchases = [...acceptedPurchases, newPurchase];

      // Salva nelle preferenze
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingLoansList: JSON.stringify(updatedLoans),
          acceptedPurchases: JSON.stringify(updatedPurchases),
        }),
      });

      if (res.ok) {
        setExistingLoans(updatedLoans);
        setAcceptedPurchases(updatedPurchases);
        toast.success("Spesa accettata! Il prestito e stato aggiunto al tuo profilo finanziario.");
      } else {
        toast.error("Errore nel salvataggio");
      }
    } catch {
      toast.error("Errore di rete");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRemovePurchase = async (purchaseId: string) => {
    if (!user) return;
    const updatedPurchases = acceptedPurchases.filter(p => p.id !== purchaseId);
    const updatedLoans = existingLoans.filter(l => l.id !== purchaseId);
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingLoansList: JSON.stringify(updatedLoans),
          acceptedPurchases: JSON.stringify(updatedPurchases),
        }),
      });
      if (res.ok) {
        setAcceptedPurchases(updatedPurchases);
        setExistingLoans(updatedLoans);
        toast.success("Acquisto rimosso");
      }
    } catch { toast.error("Errore di rete"); }
  };

  const isAlreadyAccepted = acceptedPurchases.some(p =>
    p.itemName === (sim.itemName || sim.category) && p.totalPrice === sim.totalPrice
  );

  // --- CALCOLI ---
  const calculations = useMemo(() => {
    const loanAmount = sim.isFinanced ? sim.totalPrice - sim.downPayment : 0;
    const monthlyRate = (sim.financingRate / 100) / 12;
    const numPayments = sim.financingYears * 12;

    // Rata mensile finanziamento
    const monthlyPayment = loanAmount > 0 && monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : loanAmount > 0 ? loanAmount / numPayments : 0;

    // Totale interessi
    const totalInterest = monthlyPayment * numPayments - loanAmount;

    // Costo totale reale dell'acquisto
    const totalCostOfPurchase = sim.totalPrice + totalInterest;

    // Costi annuali ricorrenti per categoria
    let annualRecurringCosts = 0;
    if (sim.category === "auto") {
      annualRecurringCosts = sim.annualInsurance + sim.annualMaintenance + sim.monthlyFuel * 12;
    } else if (sim.category === "immobile") {
      annualRecurringCosts = sim.condominiumFees * 12 + sim.imuTax * 12;
    }

    // TCO su N anni (Total Cost of Ownership)
    const tcoYears = sim.category === "auto" ? 5 : sim.category === "arredamento" ? sim.usefulLifeYears : sim.financingYears;
    const totalTCO = totalCostOfPurchase + annualRecurringCosts * tcoYears;

    // Valore residuo (svalutazione per auto)
    let residualValue = sim.totalPrice;
    if (sim.category === "auto") {
      for (let i = 0; i < tcoYears; i++) {
        residualValue *= (1 - sim.depreciationRate / 100);
      }
    } else if (sim.category === "arredamento") {
      residualValue = Math.max(0, sim.totalPrice * (1 - tcoYears / Math.max(sim.usefulLifeYears, 1)));
    } else if (sim.category === "immobile") {
      residualValue = sim.totalPrice * Math.pow(1.02, tcoYears);
    }

    // Costo opportunita: se investissi la stessa somma al rendimento reale atteso dell'utente
    const realReturnForOpportunity = Math.max(0, (snapshot.fireExpectedReturn - snapshot.expectedInflation) / 100);
    const cashOutlay = sim.isFinanced ? sim.downPayment : sim.totalPrice;
    const opportunityCost = cashOutlay * Math.pow(1 + realReturnForOpportunity, tcoYears) - cashOutlay;

    // Costo netto reale (costo totale - valore residuo)
    const netRealCost = totalTCO - residualValue;

    // Impatto sul patrimonio: considera il costo totale dell'impegno (anticipo + debito residuo + costi ricorrenti)
    // IMPORTANTE: usiamo il patrimonio INVESTIBILE (escludendo immobili illiquidi)
    const totalFinancialCommitment = sim.isFinanced
      ? totalCostOfPurchase + annualRecurringCosts * tcoYears  // prezzo + interessi + costi ricorrenti
      : sim.totalPrice + annualRecurringCosts * tcoYears;
    const investableDenominator = Math.max(snapshot.investableNetWorth, 1);
    const wealthImpact = (totalFinancialCommitment / investableDenominator) * 100;
    // Anche peso sul patrimonio totale (per riferimento)
    const wealthImpactTotal = (totalFinancialCommitment / Math.max(snapshot.netWorth, 1)) * 100;

    // DTI pre-acquisto (rate prestiti gia' in corso / reddito)
    const dtiPre = snapshot.currentDTI * 100;
    // Rapporto rata/reddito post-acquisto (include rate esistenti + nuova rata)
    const dtiPostPurchase = snapshot.monthlyIncome > 0
      ? ((snapshot.existingLoansMonthlyPayment + monthlyPayment) / snapshot.monthlyIncome) * 100 : 0;

    // Liquidita residua dopo l'esborso
    const liquidityAfter = snapshot.liquidAssets + snapshot.emergencyFund - cashOutlay;

    // Mesi di emergenza residui — basati sulle SPESE mensili (reddito non e' uno scudo)
    const baselineMonthly = Math.max(snapshot.monthlyExpenses + snapshot.existingLoansMonthlyPayment, 1);
    const emergencyMonthsLeft = Math.max(0, liquidityAfter) / baselineMonthly;
    const emergencyMonthsUsed = cashOutlay / baselineMonthly;

    // Per immobili: rendimento da affitto
    const annualRentIncome = sim.monthlyRent * 12;
    const netRentYield = sim.totalPrice > 0 ? ((annualRentIncome - annualRecurringCosts) / sim.totalPrice) * 100 : 0;

    // Ritardo FIRE (mesi) — calcolato qui per alimentare il verdetto numerico
    let fireDelayMonthsValue = 0;
    const hasFireCtx = snapshot.currentAge !== null &&
      (snapshot.monthlySavings > 0 || (snapshot.liquidAssets + snapshot.emergencyFund) > 0);
    if (hasFireCtx) {
      const baseParams = {
        startingCapital: snapshot.liquidAssets + snapshot.emergencyFund,
        monthlySavings: snapshot.monthlySavings,
        monthlyExpensesAtFire: snapshot.expectedMonthlyExpensesAtFire,
        expectedReturnPct: snapshot.fireExpectedReturn,
        inflationPct: snapshot.expectedInflation,
        withdrawalRatePct: snapshot.fireWithdrawalRate,
        currentAge: snapshot.currentAge ?? 30,
        retirementAge: snapshot.retirementAge,
      };
      const base = projectFire(baseParams);
      const withBuy = projectFire({
        ...baseParams,
        oneTimeOutflow: cashOutlay,
        recurringMonthlyCost: sim.isFinanced ? monthlyPayment : 0,
        recurringMonths: sim.isFinanced ? sim.financingYears * 12 : 0,
        ongoingMonthlyCost: annualRecurringCosts / 12,
        ongoingMonths: tcoYears * 12,
      });
      if (base.monthsToFire >= 0 && withBuy.monthsToFire >= 0) {
        fireDelayMonthsValue = withBuy.monthsToFire - base.monthsToFire;
      }
    }

    return {
      loanAmount, monthlyPayment, totalInterest, totalCostOfPurchase,
      annualRecurringCosts, totalTCO, residualValue, opportunityCost,
      netRealCost, wealthImpact, wealthImpactTotal, emergencyMonthsUsed, dtiPostPurchase, dtiPre,
      liquidityAfter, emergencyMonthsLeft, tcoYears, cashOutlay,
      totalFinancialCommitment, annualRentIncome, netRentYield,
      realReturnForOpportunity, fireDelayMonthsValue,
    };
  }, [sim, snapshot]);

  // --- CONSIGLI PROFESSIONALI ---
  const advices = useMemo((): Advice[] => {
    const list: Advice[] = [];
    const c = calculations;
    const s = snapshot;

    // 1. Analisi liquidita
    if (c.liquidityAfter < 0) {
      list.push({
        type: "danger",
        title: "Liquidita Insufficiente",
        message: `Non hai abbastanza liquidita disponibile per coprire l'esborso iniziale di ${formatEuro(c.cashOutlay)}. Ti mancano ${formatEuro(Math.abs(c.liquidityAfter))}. Considera di ridurre l'importo, aumentare l'anticipo o posticipare l'acquisto.`,
        icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      });
    } else if (c.emergencyMonthsLeft < 3) {
      list.push({
        type: "danger",
        title: "Fondo Emergenza a Rischio",
        message: `Dopo l'acquisto ti resterebbero solo ${c.emergencyMonthsLeft.toFixed(1)} mesi di spese coperte. La regola aurea e avere almeno 3-6 mesi. Un imprevisto (perdita lavoro, spesa medica) potrebbe metterti in seria difficolta.`,
        icon: <ShieldCheck className="w-5 h-5 text-red-500" />,
      });
    } else if (c.emergencyMonthsLeft < 6) {
      list.push({
        type: "warning",
        title: "Fondo Emergenza Sotto la Soglia Ideale",
        message: `Dopo l'acquisto avresti ${c.emergencyMonthsLeft.toFixed(1)} mesi di copertura. E sufficiente ma non ideale: i consulenti raccomandano 6 mesi. Valuta se puoi ricostituirlo rapidamente con il tuo risparmio mensile.`,
        icon: <ShieldCheck className="w-5 h-5 text-amber-500" />,
      });
    } else {
      list.push({
        type: "success",
        title: "Fondo Emergenza Solido",
        message: `Dopo l'acquisto manterresti ${formatMonthsCoverage(c.emergencyMonthsLeft)} di copertura. Ottima posizione: puoi affrontare l'acquisto senza compromettere la tua rete di sicurezza finanziaria.`,
        icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      });
    }

    // 2. Impatto patrimoniale — misurato sul patrimonio INVESTIBILE (esclusi immobili)
    const hasRealEstate = s.realEstateValue > 0;
    const realEstateHint = hasRealEstate
      ? ` (patrimonio totale ${formatEuro(s.netWorth)}, ma escludiamo ${formatEuro(s.realEstateValue)} di immobili illiquidi)`
      : "";
    if (c.wealthImpact > 50) {
      list.push({
        type: "danger",
        title: "Forte Impatto sul Patrimonio Investibile",
        message: `L'impegno complessivo di ${formatEuro(c.totalFinancialCommitment)} (prezzo + interessi + costi ricorrenti su ${c.tcoYears} anni) pesa per il ${c.wealthImpact.toFixed(0)}% sul tuo patrimonio investibile di ${formatEuro(s.investableNetWorth)}${realEstateHint}. E un'esposizione eccessiva: immobili gia' posseduti non sono un cuscinetto spendibile.`,
        icon: <Scale className="w-5 h-5 text-red-500" />,
      });
    } else if (c.wealthImpact > 25) {
      list.push({
        type: "warning",
        title: "Impatto Significativo sul Patrimonio Investibile",
        message: `L'impegno totale di ${formatEuro(c.totalFinancialCommitment)} pesa per il ${c.wealthImpact.toFixed(0)}% sul patrimonio investibile di ${formatEuro(s.investableNetWorth)}${realEstateHint}. E un impegno importante ma gestibile se hai reddito stabile e puoi ricostituire il capitale liquido.`,
        icon: <Scale className="w-5 h-5 text-amber-500" />,
      });
    } else {
      list.push({
        type: "success",
        title: "Impatto Patrimoniale Contenuto",
        message: `L'impegno complessivo di ${formatEuro(c.totalFinancialCommitment)} e' il ${c.wealthImpact.toFixed(0)}% del patrimonio investibile di ${formatEuro(s.investableNetWorth)}${realEstateHint}. Assolutamente proporzionato alla tua capacita mobilizzabile.`,
        icon: <Scale className="w-5 h-5 text-emerald-500" />,
      });
    }

    // 2b. Esposizione cumulativa (se hai gia' piu' prestiti in corso)
    if (s.existingLoansCount >= 2) {
      list.push({
        type: "warning",
        title: `Hai gia' ${s.existingLoansCount} prestiti in corso`,
        message: `Le rate attuali sono ${formatEuro(s.existingLoansMonthlyPayment)}/mese (DTI ${(s.currentDTI * 100).toFixed(1)}%). Un ulteriore impegno si somma a quello gia' esistente: valuta se la capacita di assorbire imprevisti regge su piu' fronti contemporaneamente.`,
        icon: <CreditCard className="w-5 h-5 text-amber-500" />,
      });
    }

    // 3. DTI per finanziamenti (include rate gia' in corso)
    if (sim.isFinanced) {
      const dtiPreStr = snapshot.existingLoansMonthlyPayment > 0
        ? ` (parti gia' da ${formatEuro(snapshot.existingLoansMonthlyPayment)}/mese di rate in corso = ${c.dtiPre.toFixed(1)}%)`
        : "";
      if (c.dtiPostPurchase > 33) {
        list.push({
          type: "danger",
          title: "Rapporto Rata/Reddito Critico",
          message: `La rata di ${formatEuro(c.monthlyPayment)}/mese porterebbe il tuo DTI totale al ${c.dtiPostPurchase.toFixed(1)}%${dtiPreStr}, oltre la soglia del 33%. Le banche potrebbero rifiutare il finanziamento e, anche se approvato, rischieresti stress finanziario cronico.`,
          icon: <CreditCard className="w-5 h-5 text-red-500" />,
        });
      } else if (c.dtiPostPurchase > 20) {
        list.push({
          type: "warning",
          title: "Rata Sostenibile ma Impegnativa",
          message: `Con una rata di ${formatEuro(c.monthlyPayment)}/mese il tuo DTI sarebbe al ${c.dtiPostPurchase.toFixed(1)}%. Rientra nei parametri ma limita la tua capacita di risparmio. Considera se nei prossimi ${sim.financingYears} anni il tuo reddito e stabile.`,
          icon: <CreditCard className="w-5 h-5 text-amber-500" />,
        });
      } else {
        list.push({
          type: "success",
          title: "Finanziamento Molto Sostenibile",
          message: `La rata di ${formatEuro(c.monthlyPayment)}/mese rappresenta solo il ${c.dtiPostPurchase.toFixed(1)}% del tuo reddito. Hai ampio margine per gestire il finanziamento senza impattare il tuo stile di vita o la capacita di risparmio.`,
          icon: <CreditCard className="w-5 h-5 text-emerald-500" />,
        });
      }

      // Costo degli interessi
      const interestPercentage = c.loanAmount > 0 ? (c.totalInterest / c.loanAmount) * 100 : 0;
      if (interestPercentage > 30) {
        list.push({
          type: "warning",
          title: "Costo del Denaro Elevato",
          message: `Pagherai ${formatEuro(c.totalInterest)} di interessi, pari al ${interestPercentage.toFixed(0)}% del capitale finanziato. Considera di aumentare l'anticipo, ridurre la durata del finanziamento o confrontare piu offerte per ottenere un tasso migliore.`,
          icon: <BadgePercent className="w-5 h-5 text-amber-500" />,
        });
      }
    }

    // 4. Consigli specifici per categoria
    if (sim.category === "auto") {
      // Svalutazione auto
      const depreciationLoss = sim.totalPrice - c.residualValue;
      list.push({
        type: "info",
        title: `Svalutazione Stimata in ${c.tcoYears} Anni`,
        message: `L'auto perdera circa ${formatEuro(depreciationLoss)} di valore (${((depreciationLoss / sim.totalPrice) * 100).toFixed(0)}%). Valore residuo stimato: ${formatEuro(c.residualValue)}. Un'auto usata di 2-3 anni ti farebbe risparmiare la svalutazione iniziale piu aggressiva (20-30% il primo anno).`,
        icon: <TrendingDown className="w-5 h-5 text-blue-500" />,
      });

      // TCO mensile
      const monthlyTCO = c.totalTCO / (c.tcoYears * 12);
      list.push({
        type: "info",
        title: "Costo Reale Mensile di Possesso",
        message: `Il costo reale mensile dell'auto (rata + assicurazione + manutenzione + carburante + svalutazione) e di circa ${formatEuro(monthlyTCO)}/mese. Chiediti: questo valore e giustificato dal tuo utilizzo quotidiano?`,
        icon: <CircleDollarSign className="w-5 h-5 text-blue-500" />,
      });

      // Regola del 20/4/10
      const rule20 = sim.downPayment >= sim.totalPrice * 0.20;
      const rule4 = sim.financingYears <= 4;
      const rule10 = s.monthlyIncome > 0 && (c.monthlyPayment + sim.annualInsurance / 12) / s.monthlyIncome <= 0.10;
      if (sim.isFinanced && (!rule20 || !rule4 || !rule10)) {
        const violations = [];
        if (!rule20) violations.push("anticipo almeno 20%");
        if (!rule4) violations.push("durata max 4 anni");
        if (!rule10) violations.push("rata+assicurazione max 10% reddito");
        list.push({
          type: "warning",
          title: "Regola 20/4/10 Non Rispettata",
          message: `La regola d'oro per l'acquisto auto suggerisce: ${violations.join(", ")}. Non e vincolante, ma rispettarla protegge da sovra-indebitamento su un bene che si svaluta.`,
          icon: <Lightbulb className="w-5 h-5 text-amber-500" />,
        });
      }
    }

    if (sim.category === "immobile") {
      if (sim.monthlyRent > 0) {
        list.push({
          type: c.netRentYield > 4 ? "success" : c.netRentYield > 2 ? "info" : "warning",
          title: `Rendimento Netto da Affitto: ${c.netRentYield.toFixed(2)}%`,
          message: c.netRentYield > 4
            ? `Ottimo rendimento netto! Supera il 4%, un livello competitivo rispetto ai mercati finanziari, soprattutto considerando la rivalutazione immobiliare.`
            : c.netRentYield > 2
              ? `Rendimento discreto. E nella media del mercato italiano. Tieni conto che l'immobile offre anche protezione dall'inflazione e potenziale rivalutazione.`
              : `Rendimento basso: sotto il 2% netto, il capitale potrebbe rendere di piu investito in strumenti finanziari diversificati (ETF, obbligazioni). Valuta se il rendimento giustifica l'illiquidita dell'investimento.`,
          icon: <Home className="w-5 h-5" />,
        });
      }
    }

    if (sim.category === "arredamento") {
      const costPerYear = sim.totalPrice / Math.max(sim.usefulLifeYears, 1);
      const costPerMonth = costPerYear / 12;
      list.push({
        type: "info",
        title: "Ammortamento Reale del Bene",
        message: `Spalmare il costo sulla vita utile stimata (${sim.usefulLifeYears} anni) significa ${formatEuro(costPerYear)}/anno o ${formatEuro(costPerMonth)}/mese. Questo ti aiuta a valutare se il prezzo e ragionevole rispetto alla durata del beneficio.`,
        icon: <Clock className="w-5 h-5 text-purple-500" />,
      });

      if (sim.isFinanced && sim.totalPrice < 3000) {
        list.push({
          type: "warning",
          title: "Finanziamento su Piccoli Importi",
          message: `Finanziare ${formatEuro(sim.totalPrice)} comporta costi di interesse sproporzionati. Per importi sotto i 3.000-5.000 euro, se hai la liquidita, e quasi sempre preferibile pagare in contanti o utilizzare un piano 0% offerto dal rivenditore.`,
          icon: <Lightbulb className="w-5 h-5 text-amber-500" />,
        });
      }
    }

    // 5. Costo opportunita (sempre) — usa il rendimento reale atteso dell'utente
    if (c.opportunityCost > 500) {
      const realRetPct = (c.realReturnForOpportunity * 100).toFixed(1);
      list.push({
        type: "info",
        title: "Costo Opportunita dell'Investimento Alternativo",
        message: `Se investissi i ${formatEuro(c.cashOutlay)} al ${realRetPct}% reale (${snapshot.fireExpectedReturn}% nominale - ${snapshot.expectedInflation}% inflazione) per ${c.tcoYears} anni, genereresti circa ${formatEuro(c.opportunityCost)} di rendimento in euro odierni. Non significa "non comprare", ma ti aiuta a capire il vero costo della scelta in termini di crescita patrimoniale mancata.`,
        icon: <TrendingUp className="w-5 h-5 text-purple-500" />,
      });
    }

    // 6. Verdetto finale con NUMERI (costo totale, delay FIRE, opportunita)
    const dangers = list.filter(a => a.type === "danger").length;
    const warnings = list.filter(a => a.type === "warning").length;
    const multiLoanPenalty = s.existingLoansCount >= 2 ? 1 : 0;
    const effectiveWarnings = warnings + multiLoanPenalty;

    // Costruzione frase numerica condivisa
    const fireDelay = c.fireDelayMonthsValue;
    const delayPhrase = fireDelay > 1
      ? ` e sposta il tuo FIRE di circa ${Math.round(fireDelay)} mes${Math.round(fireDelay) === 1 ? "e" : "i"}`
      : "";
    const costPhrase = `ti costa ${formatEuro(c.totalFinancialCommitment)} totali in ${c.tcoYears} anni${c.opportunityCost > 500 ? ` (inclusi ${formatEuro(c.opportunityCost)} di mancato rendimento)` : ""}`;

    if (dangers > 0) {
      list.push({
        type: "danger",
        title: "Verdetto: Acquisto Sconsigliato",
        message: `${dangers} criticita gravi. Questo acquisto ${costPhrase}${delayPhrase}. Prima di procedere: modello piu economico, anticipo maggiore, o posticipare per accumulare liquidita.`,
        icon: <Target className="w-5 h-5 text-red-500" />,
      });
    } else if (effectiveWarnings >= 2) {
      list.push({
        type: "warning",
        title: "Verdetto: Procedere con Cautela",
        message: `${warnings} punti di attenzione${multiLoanPenalty ? ` + ${s.existingLoansCount} prestiti gia' in corso` : ""}. Costo reale: ${costPhrase}${delayPhrase}. Procedi solo con un piano chiaro per mitigare i rischi.`,
        icon: <Target className="w-5 h-5 text-amber-500" />,
      });
    } else {
      list.push({
        type: "success",
        title: "Verdetto: Acquisto Sostenibile",
        message: `Parametri in zona di comfort. Tieni presente che ${costPhrase}${delayPhrase ? `: ${delayPhrase.replace(" e ", "")}` : ""}. Puoi procedere con serenita.`,
        icon: <Target className="w-5 h-5 text-emerald-500" />,
      });
    }

    return list;
  }, [calculations, snapshot, sim]);

  // --- SCORE COMPLESSIVO ---
  const overallScore = useMemo(() => {
    const dangers = advices.filter(a => a.type === "danger").length;
    const warnings = advices.filter(a => a.type === "warning").length;
    const successes = advices.filter(a => a.type === "success").length;
    // Score 0-100
    let score = 80;
    score -= dangers * 25;
    score -= warnings * 10;
    score += successes * 5;
    return Math.max(0, Math.min(100, score));
  }, [advices]);

  if (!isMounted || isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="text-center space-y-4 pt-4 pb-6">
        <div className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/75 mb-2">
          <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="flex flex-wrap items-center justify-center gap-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
          Consulente <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Acquisti</span>
        </h1>
        <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-400 md:text-xl">
          Simula un acquisto importante e ricevi un&apos;analisi professionale con consigli basati sulla tua situazione patrimoniale, reddito e principi di finanza comportamentale.
        </p>
        {!user && (
          <div className="pt-2 flex justify-center">
            <span className="text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 px-4 py-1.5 rounded-full font-medium">
              Accedi per ricevere consigli personalizzati basati sul tuo patrimonio
            </span>
          </div>
        )}
      </div>

      {/* Snapshot Patrimonio Sintetico */}
      {user && snapshot.netWorth > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Patrimonio Netto", value: formatEuro(snapshot.netWorth), sub: `assets ${formatEuro(snapshot.totalAssets)}`, icon: <Wallet className="w-4 h-4" />, color: "text-slate-900 dark:text-slate-100" },
            { label: "Liquidita", value: formatEuro(snapshot.liquidAssets + snapshot.emergencyFund), sub: `${(snapshot.monthlyIncome > 0 ? (snapshot.liquidAssets + snapshot.emergencyFund) / snapshot.monthlyIncome : 0).toFixed(1)} mesi reddito`, icon: <PiggyBank className="w-4 h-4" />, color: "text-blue-600 dark:text-blue-400" },
            { label: "Reddito Netto", value: formatEuro(snapshot.monthlyIncome), sub: `/mese`, icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Risparmio Reale", value: formatEuro(snapshot.monthlySavings), sub: `dopo spese e rate`, icon: <BadgePercent className="w-4 h-4" />, color: "text-indigo-600 dark:text-indigo-400" },
            { label: "DTI Attuale", value: `${(snapshot.currentDTI * 100).toFixed(1)}%`, sub: `rate ${formatEuro(snapshot.existingLoansMonthlyPayment)}/m`, icon: <CreditCard className="w-4 h-4" />, color: snapshot.currentDTI > 0.33 ? "text-red-500" : snapshot.currentDTI > 0.2 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400" },
            { label: "Debiti Totali", value: formatEuro(snapshot.totalDebts), sub: snapshot.currentAge !== null ? `eta' ${snapshot.currentAge}a` : "eta' n/d", icon: <Scale className="w-4 h-4" />, color: "text-red-500" },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                {item.icon} {item.label}
              </div>
              <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
              <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{item.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Acquisti gia' accettati (in cima, per vedere impegno cumulato prima di simularne un altro) */}
      {user && acceptedPurchases.length > 0 && (() => {
        const totalCommitment = acceptedPurchases.reduce((acc, p) => acc + (p.totalTCO || p.totalPrice), 0);
        const totalMonthlyPayments = acceptedPurchases
          .filter(p => p.isFinanced)
          .reduce((acc, p) => acc + p.monthlyPayment, 0);
        return (
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-4 backdrop-blur-xl dark:border-indigo-900/60 dark:bg-indigo-950/30 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Acquisti Gia&apos; Accettati ({acceptedPurchases.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px]">
                <span className="rounded-full bg-white/70 px-3 py-1 font-bold text-indigo-700 dark:bg-slate-900/70 dark:text-indigo-300">
                  Impegno TCO: {formatEuro(totalCommitment)}
                </span>
                {totalMonthlyPayments > 0 && (
                  <span className="rounded-full bg-white/70 px-3 py-1 font-bold text-amber-700 dark:bg-slate-900/70 dark:text-amber-300">
                    Rate totali: {formatEuro(totalMonthlyPayments)}/mese
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {acceptedPurchases.map(p => (
                <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.itemName}</span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        {p.category}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(p.acceptedAt).toLocaleDateString("it-IT")}
                      </span>
                      <span>Prezzo: {formatEuro(p.totalPrice)}</span>
                      {p.isFinanced && (
                        <>
                          <span>Rata: {formatEuro(p.monthlyPayment)}/m</span>
                          <span className="text-red-500">Interessi: {formatEuro(p.totalInterest)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePurchase(p.id)}
                    className="h-9 w-9 shrink-0 rounded-full text-slate-400 hover:text-red-500"
                    aria-label="Rimuovi acquisto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <PurchaseForm sim={sim} onUpdateSim={updateSim} onAnalyze={() => setShowResults(true)} />
        <div className="lg:col-span-7">
          <AdvicePanel
            showResults={showResults}
            itemName={sim.itemName}
            isFinanced={sim.isFinanced}
            overallScore={overallScore}
            calculations={calculations}
            advices={advices}
            hasUser={!!user}
            onAcceptPurchase={handleAcceptPurchase}
            isAccepting={isAccepting}
            isAlreadyAccepted={isAlreadyAccepted}
          />
        </div>
      </div>

      {/* Grafici e analisi avanzate — ORDINE DIDATTICO: prima i numeri, poi l'impatto, poi i confronti */}
      {showResults && user && (
        <div className="space-y-6">
          <CalculationBreakdown sim={sim} snapshot={snapshot} calculations={calculations} />
          <FireImpactChart sim={sim} calculations={calculations} snapshot={snapshot} />
          <ScenarioComparison sim={sim} snapshot={snapshot} calculations={calculations} />
          <SensitivityChart sim={sim} snapshot={snapshot} calculations={calculations} />
          <PurchaseImpactChart
            sim={sim}
            calculations={calculations}
            snapshot={snapshot}
          />
        </div>
      )}
    </div>
  );
}
