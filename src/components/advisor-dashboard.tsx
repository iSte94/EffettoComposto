"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck, CreditCard, TrendingDown, TrendingUp,
  AlertTriangle, Loader2, PiggyBank, Target,
  Wallet, BadgePercent, Clock, Scale, Lightbulb,
  CircleDollarSign, Home
} from "lucide-react";

import { formatEuro } from "@/lib/format";
import type { FinancialSnapshot, PurchaseSimulation, Advice, AcceptedPurchase, ExistingLoan } from "@/types";
import { PurchaseForm } from "@/components/advisor/purchase-form";
import { AdvicePanel } from "@/components/advisor/advice-panel";
import { PurchaseImpactChart } from "@/components/advisor/purchase-impact-chart";
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
  depreciationRate: 15,
  monthlyRent: 0,
  condominiumFees: 100,
  imuTax: 200,
  usefulLifeYears: 10,
};

export function AdvisorDashboard({ user }: AdvisorDashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot>({
    totalAssets: 0, totalDebts: 0, netWorth: 0, liquidAssets: 0,
    emergencyFund: 0, monthlyIncome: 0, realEstateValue: 0,
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

        if (patrimonioData.records?.length > 0) {
          const latest = patrimonioData.records[patrimonioData.records.length - 1];
          liquidAssets = (latest.liquidStockValue || 0) + (latest.bitcoinAmount || 0) * (latest.bitcoinPrice || 0);
          emergencyFund = latest.emergencyFund || 0;
          realEstateValue = latest.realEstateValue || 0;
          totalDebts = latest.debtsTotal || 0;
          const safeHavens = latest.safeHavens || 0;
          const pensionFund = latest.pensionFund || 0;
          totalAssets = liquidAssets + safeHavens + emergencyFund + pensionFund;
        }

        const monthlyIncome = prefData.preferences?.netIncome || 0;

        // Carica prestiti e acquisti accettati
        if (prefData.preferences?.existingLoansList) {
          try { setExistingLoans(JSON.parse(prefData.preferences.existingLoansList)); } catch { }
        }
        if (prefData.preferences?.acceptedPurchases) {
          try { setAcceptedPurchases(JSON.parse(prefData.preferences.acceptedPurchases)); } catch { }
        }

        setSnapshot({
          totalAssets,
          totalDebts,
          netWorth: totalAssets - totalDebts,
          liquidAssets,
          emergencyFund,
          monthlyIncome,
          realEstateValue,
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

    // Costo opportunita: se investissi la stessa somma al 7%
    const cashOutlay = sim.isFinanced ? sim.downPayment : sim.totalPrice;
    const opportunityCost = cashOutlay * Math.pow(1.07, tcoYears) - cashOutlay;

    // Costo netto reale (costo totale - valore residuo)
    const netRealCost = totalTCO - residualValue;

    // Impatto sul patrimonio: considera il costo totale dell'impegno (anticipo + debito residuo + costi ricorrenti)
    // Non solo l'anticipo, ma l'intera esposizione finanziaria
    const totalFinancialCommitment = sim.isFinanced
      ? totalCostOfPurchase + annualRecurringCosts * tcoYears  // prezzo + interessi + costi ricorrenti
      : sim.totalPrice + annualRecurringCosts * tcoYears;
    const wealthImpact = (totalFinancialCommitment / Math.max(snapshot.netWorth, 1)) * 100;

    // Mesi di fondo emergenza consumati
    const emergencyMonthsUsed = snapshot.monthlyIncome > 0
      ? cashOutlay / snapshot.monthlyIncome : 0;

    // Rapporto rata/reddito post-acquisto
    const dtiPostPurchase = snapshot.monthlyIncome > 0
      ? (monthlyPayment / snapshot.monthlyIncome) * 100 : 0;

    // Liquidita residua dopo l'esborso
    const liquidityAfter = snapshot.liquidAssets + snapshot.emergencyFund - cashOutlay;

    // Mesi di emergenza residui
    const emergencyMonthsLeft = snapshot.monthlyIncome > 0
      ? Math.max(0, liquidityAfter) / snapshot.monthlyIncome : 0;

    // Per immobili: rendimento da affitto
    const annualRentIncome = sim.monthlyRent * 12;
    const netRentYield = sim.totalPrice > 0 ? ((annualRentIncome - annualRecurringCosts) / sim.totalPrice) * 100 : 0;

    return {
      loanAmount, monthlyPayment, totalInterest, totalCostOfPurchase,
      annualRecurringCosts, totalTCO, residualValue, opportunityCost,
      netRealCost, wealthImpact, emergencyMonthsUsed, dtiPostPurchase,
      liquidityAfter, emergencyMonthsLeft, tcoYears, cashOutlay,
      totalFinancialCommitment, annualRentIncome, netRentYield,
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
        message: `Dopo l'acquisto manterresti ${c.emergencyMonthsLeft.toFixed(1)} mesi di copertura. Ottima posizione: puoi affrontare l'acquisto senza compromettere la tua rete di sicurezza finanziaria.`,
        icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      });
    }

    // 2. Impatto patrimoniale (basato sull'impegno totale: prezzo + interessi + costi ricorrenti)
    if (c.wealthImpact > 50) {
      list.push({
        type: "danger",
        title: "Forte Impatto Patrimoniale",
        message: `L'impegno finanziario complessivo di ${formatEuro(c.totalFinancialCommitment)} (prezzo + interessi + costi ricorrenti su ${c.tcoYears} anni) rappresenta il ${c.wealthImpact.toFixed(0)}% del tuo patrimonio netto di ${formatEuro(s.netWorth)}. E un'esposizione eccessiva: nessun singolo impegno dovrebbe superare il 30-40% del patrimonio.`,
        icon: <Scale className="w-5 h-5 text-red-500" />,
      });
    } else if (c.wealthImpact > 25) {
      list.push({
        type: "warning",
        title: "Impatto Patrimoniale Significativo",
        message: `L'impegno totale di ${formatEuro(c.totalFinancialCommitment)} pesa per il ${c.wealthImpact.toFixed(0)}% sul tuo patrimonio netto di ${formatEuro(s.netWorth)}. E un impegno importante ma gestibile se hai un reddito stabile e la capacita di ricostituire il capitale.`,
        icon: <Scale className="w-5 h-5 text-amber-500" />,
      });
    } else {
      list.push({
        type: "success",
        title: "Impatto Patrimoniale Contenuto",
        message: `L'impegno complessivo di ${formatEuro(c.totalFinancialCommitment)} rappresenta il ${c.wealthImpact.toFixed(0)}% del tuo patrimonio netto di ${formatEuro(s.netWorth)}. Assolutamente gestibile e proporzionato.`,
        icon: <Scale className="w-5 h-5 text-emerald-500" />,
      });
    }

    // 3. DTI per finanziamenti
    if (sim.isFinanced) {
      if (c.dtiPostPurchase > 33) {
        list.push({
          type: "danger",
          title: "Rapporto Rata/Reddito Critico",
          message: `La rata di ${formatEuro(c.monthlyPayment)}/mese porterebbe il tuo DTI al ${c.dtiPostPurchase.toFixed(1)}%, oltre la soglia del 33%. Le banche potrebbero rifiutare il finanziamento e, anche se approvato, rischieresti stress finanziario cronico.`,
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

    // 5. Costo opportunita (sempre)
    if (c.opportunityCost > 500) {
      list.push({
        type: "info",
        title: "Costo Opportunita dell'Investimento Alternativo",
        message: `Se investissi i ${formatEuro(c.cashOutlay)} al 7% annuo per ${c.tcoYears} anni, genereresti circa ${formatEuro(c.opportunityCost)} di rendimento. Questo non significa "non comprare", ma ti aiuta a capire il vero costo della scelta in termini di crescita patrimoniale mancata.`,
        icon: <TrendingUp className="w-5 h-5 text-purple-500" />,
      });
    }

    // 6. Verdetto finale
    const dangers = list.filter(a => a.type === "danger").length;
    const warnings = list.filter(a => a.type === "warning").length;

    if (dangers > 0) {
      list.push({
        type: "danger",
        title: "Verdetto: Acquisto Sconsigliato",
        message: `Ci sono ${dangers} criticita gravi. Prima di procedere, affronta i problemi evidenziati sopra. Potresti considerare: un modello piu economico, un anticipo maggiore, posticipare l'acquisto per accumulare piu liquidita, o rivedere completamente la necessita dell'acquisto.`,
        icon: <Target className="w-5 h-5 text-red-500" />,
      });
    } else if (warnings >= 2) {
      list.push({
        type: "warning",
        title: "Verdetto: Procedere con Cautela",
        message: `L'acquisto e fattibile ma presenta ${warnings} punti di attenzione. Puoi procedere se hai un piano chiaro per mitigare i rischi evidenziati. Valuta se puoi migliorare le condizioni (anticipo maggiore, tasso migliore, modello piu economico).`,
        icon: <Target className="w-5 h-5 text-amber-500" />,
      });
    } else {
      list.push({
        type: "success",
        title: "Verdetto: Acquisto Sostenibile",
        message: `La tua situazione finanziaria supporta bene questo acquisto. I parametri chiave (liquidita, DTI, impatto patrimoniale) sono tutti in zona di comfort. Puoi procedere con serenita.`,
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Patrimonio Netto", value: formatEuro(snapshot.netWorth), icon: <Wallet className="w-4 h-4" />, color: "text-slate-900 dark:text-slate-100" },
            { label: "Liquidita Disponibile", value: formatEuro(snapshot.liquidAssets + snapshot.emergencyFund), icon: <PiggyBank className="w-4 h-4" />, color: "text-blue-600 dark:text-blue-400" },
            { label: "Reddito Mensile", value: formatEuro(snapshot.monthlyIncome), icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Debiti Attuali", value: formatEuro(snapshot.totalDebts), icon: <CreditCard className="w-4 h-4" />, color: "text-red-500" },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                {item.icon} {item.label}
              </div>
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

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

      {/* Impatto Futuro — Grafici */}
      {showResults && user && (
        <PurchaseImpactChart
          sim={sim}
          calculations={calculations}
          snapshot={snapshot}
          acceptedPurchases={acceptedPurchases}
          onRemovePurchase={handleRemovePurchase}
        />
      )}
    </div>
  );
}
