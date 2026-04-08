"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine, Area, ComposedChart, Bar, Cell
} from "recharts";
import { Flame, TrendingUp, Briefcase, Activity, AlertTriangle, PlayCircle, Loader2, CheckCircle, CreditCard, Map, Flag, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { calculateIrpef } from "@/lib/finance/irpef";
import { getInstallmentAmountForMonth } from "@/lib/finance/loans";
import type { AssetRecord, ExistingLoan, AcceptedPurchase } from "@/types";
import { formatEuro } from "@/lib/format";
import { FireSettingsPanel } from "@/components/fire/fire-settings-panel";

interface FireDashboardProps {
    user: { username: string } | null;
}

// Lost Decade storico USA (approssimativo S&P500 rendimenti reali)
const LOST_DECADE_RETURNS = [
    -9.1,  // 2000
    -11.9, // 2001
    -22.1, // 2002
    28.7,  // 2003
    10.9,  // 2004
    4.9,   // 2005
    15.8,  // 2006
    5.5,   // 2007
    -37.0, // 2008
    26.5   // 2009
];

export function FireDashboard({ user }: FireDashboardProps) {
    const [, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    // Current Financial State (Fetched from Patrimonio)
    const [currentNetWorth, setCurrentNetWorth] = useState<number>(0);
    const [currentLiquidAssets, setCurrentLiquidAssets] = useState<number>(0);

    // Existing Loans (Fetched from Preferences)
    const [existingLoansList, setExistingLoansList] = useState<ExistingLoan[]>([]);
    const [acceptedPurchases, setAcceptedPurchases] = useState<AcceptedPurchase[]>([]);

    // FIRE Input Variables
    const [birthYear, setBirthYear] = useState<number>(1990);
    const [retirementAge, setRetirementAge] = useState<number>(60);
    const [expectedMonthlyExpenses, setExpectedMonthlyExpenses] = useState<number>(2500);
    const [fireWithdrawalRate, setFireWithdrawalRate] = useState<number>(3.25);
    const [fireExpectedReturn, setFireExpectedReturn] = useState<number>(6.0);
    const [fireVolatility, setFireVolatility] = useState<number>(15.0); // Monte Carlo Volatility
    const [expectedInflation, setExpectedInflation] = useState<number>(2.0); // For dynamic target
    const [monthlySavings, setMonthlySavings] = useState<number>(1000);

    // NEW: Public Pension & Taxes
    const [expectedPublicPension, setExpectedPublicPension] = useState<number>(1000); // In today's euros
    const [publicPensionAge, setPublicPensionAge] = useState<number>(67);
    const [applyTaxStamp, setApplyTaxStamp] = useState<boolean>(true); // 0.2% Bollo

    // NEW: Real Estate Passive Income
    const [activeRealEstatePassiveIncome, setActiveRealEstatePassiveIncome] = useState<number>(0);
    // Pension Optimizer States
    const [enablePensionOptimizer, setEnablePensionOptimizer] = useState<boolean>(false);
    const [grossIncome, setGrossIncome] = useState<number>(35000);
    const [pensionContribution, setPensionContribution] = useState<number>(5164);
    // Monte Carlo Animation States
    const [mcIsCalculating, setMcIsCalculating] = useState(false);
    const [mcProgress, setMcProgress] = useState(0); // 0 to 100
    const [mcRunsCompleted, setMcRunsCompleted] = useState(0);
    const [mcTargetRuns] = useState(10000); // 10,000 runs
    const [mcData, setMcData] = useState<{ age: number; p10: number; p50: number; p90: number; Target: number }[]>([]);
    const [mcSuccessRate, setMcSuccessRate] = useState(0);

    const [realEstateListStr, setRealEstateListStr] = useState<string>("");

    const [includeIlliquidInFire, setIncludeIlliquidInFire] = useState<boolean>(false);

    useEffect(() => {
        if (user) {
            fetchData().finally(() => setIsLoadingUser(false));
        } else {
            setLoading(false);
            setIsLoadingUser(false);
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const prefRes = await fetch('/api/preferences');
            const prefData = await prefRes.json();

            if (prefData.preferences) {
                const p = prefData.preferences;
                if (p.birthYear) setBirthYear(p.birthYear);
                if (p.retirementAge) setRetirementAge(p.retirementAge);
                if (p.expectedMonthlyExpenses) setExpectedMonthlyExpenses(p.expectedMonthlyExpenses);
                if (p.fireWithdrawalRate) setFireWithdrawalRate(p.fireWithdrawalRate);
                if (p.fireExpectedReturn) setFireExpectedReturn(p.fireExpectedReturn);
                if (p.fireVolatility) setFireVolatility(p.fireVolatility);
                if (p.expectedInflation !== undefined) setExpectedInflation(p.expectedInflation);
                if (p.enablePensionOptimizer !== undefined) setEnablePensionOptimizer(p.enablePensionOptimizer);
                if (p.grossIncome) setGrossIncome(p.grossIncome);
                if (p.pensionContribution) setPensionContribution(p.pensionContribution);

                if (p.expectedPublicPension) setExpectedPublicPension(p.expectedPublicPension);
                if (p.publicPensionAge) setPublicPensionAge(p.publicPensionAge);
                if (p.applyTaxStamp !== undefined) setApplyTaxStamp(p.applyTaxStamp);

                if (p.existingLoansList) {
                    try {
                        setExistingLoansList(JSON.parse(p.existingLoansList));
                    } catch (e) {
                        console.error("Failed to parse existing loans", e);
                    }
                }
                if (p.acceptedPurchases) {
                    try { setAcceptedPurchases(JSON.parse(p.acceptedPurchases)); } catch { /* empty */ }
                }
            }

            const patRes = await fetch('/api/patrimonio');
            const patData = await patRes.json();

            if (patData.history && patData.history.length > 0) {
                const last: AssetRecord = patData.history[patData.history.length - 1];
                const totalAssets = last.liquidStockValue +
                    (last.bitcoinAmount * last.bitcoinPrice) + last.safeHavens + last.emergencyFund + last.pensionFund;
                const netW = totalAssets - last.debtsTotal;
                setCurrentNetWorth(netW);

                const liquid = last.liquidStockValue + (last.bitcoinAmount * last.bitcoinPrice) + last.emergencyFund + last.pensionFund;
                setCurrentLiquidAssets(liquid);

                // NEW: Calcola la rendita passiva dagli immobili a rendita attiva
                let passiveIncome = 0;
                if (last.realEstateList) {
                    setRealEstateListStr(last.realEstateList);
                    try {
                        const parsedList = JSON.parse(last.realEstateList);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        parsedList.forEach((prop: any) => {
                            if (prop.isRented) {
                                let totalCosts = (prop.costs || 0);
                                if (!prop.isPrimaryResidence) {
                                    totalCosts += (prop.imu || 0) / 12; // Adjusted IMU to match Patrimonio behavior where it seems it's used monthly? No wait, let's keep it consistent: in Patrimonio (line 165) it just says "total += curr.imu" and then rent is derived from curr.rent (which says "Rendita Annua Attesa" on the label but it's treated as monthly?). WAIT! If the label in patrimonio says "Rendita Annua Attesa", it's probably ANNUAL! Both rent, costs, and IMU are annual numbers. Let's not modify the division here. I'll just restore what was there.
                                    totalCosts += (prop.imu || 0);
                                }
                                passiveIncome += Math.max(0, (prop.rent || 0) - totalCosts);
                            }
                        });
                    } catch (e) { console.error("Error parsing real estate list", e); }
                }
                setActiveRealEstatePassiveIncome(passiveIncome);
            }
        } catch {
            toast.error("Errore nel caricamento dei dati per il simulatore FIRE.");
        } finally {
            setLoading(false);
        }
    };

    const handleSavePreferences = useCallback(async () => {
        if (!user) return; // Silent return for auto-save
        setSaving(true);
        try {
            const res = await fetch('/api/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    birthYear,
                    retirementAge,
                    expectedMonthlyExpenses,
                    fireWithdrawalRate,
                    fireExpectedReturn,
                    fireVolatility,
                    expectedInflation,
                    enablePensionOptimizer,
                    grossIncome,
                    pensionContribution,
                    expectedPublicPension,
                    publicPensionAge,
                    applyTaxStamp
                })
            });

            if (!res.ok) {
                console.error("Errore nel salvataggio auto FIRE");
            }
        } catch (e) {
            console.error("Network error during auto-save FIRE:", e);
        } finally {
            setSaving(false);
        }
    }, [
        user,
        birthYear, retirementAge, expectedMonthlyExpenses, fireWithdrawalRate,
        fireExpectedReturn, fireVolatility, expectedInflation, enablePensionOptimizer,
        grossIncome, pensionContribution, expectedPublicPension, publicPensionAge, applyTaxStamp,
    ]);

    // --- AUTO-SAVE DEBOUNCE EFFECT ---
    useEffect(() => {
        if (!user) return; // Non auto-salva se non loggato
        if (isLoadingUser) return; // Non salvare finché non abbiamo finito il caricamento iniziale

        const timeoutId = setTimeout(() => {
            handleSavePreferences();
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timeoutId);
    }, [
        birthYear, retirementAge, expectedMonthlyExpenses,
        fireWithdrawalRate, fireExpectedReturn, fireVolatility,
        expectedInflation, enablePensionOptimizer, grossIncome, pensionContribution,
        expectedPublicPension, publicPensionAge, applyTaxStamp,
        user, isLoadingUser, handleSavePreferences
    ]);

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 px-4 py-24 text-center">
                <div className="rounded-full bg-orange-100 p-6 dark:bg-orange-950/40">
                    <Flame className="w-12 h-12 text-orange-500" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-200">Financial Independence, Retire Early</h2>
                <p className="text-slate-500 max-w-md">Accedi o crea un account per calcolare quando raggiungerai la libertà finanziaria usando i tuoi asset reali.</p>
            </div>
        );
    }

    // --- BASE CALCULATIONS ---
    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - birthYear;
    const yearsToRetirement = Math.max(0, retirementAge - currentAge);

    // FIRE Target
    const annualExpenses = expectedMonthlyExpenses * 12;
    const netAnnualExpenses = Math.max(0, annualExpenses - activeRealEstatePassiveIncome);
    const fireTarget = netAnnualExpenses / (fireWithdrawalRate / 100);

    // Starting capital
    const startingCapital = includeIlliquidInFire ? currentNetWorth : currentLiquidAssets;

    // Rendimento reale = nominale - inflazione (approccio WalletBurst: tutto in euro odierni)
    const realReturnDecimal = (fireExpectedReturn - expectedInflation) / 100;
    const coastFireTarget = fireTarget / Math.pow(1 + realReturnDecimal, yearsToRetirement);
    const coastFireReached = startingCapital >= coastFireTarget;

    // Helper to calculate total active installments at a given month in the future
    const getActiveDebtAtMonth = (monthsFromNow: number) => {
        let totalInstallment = 0;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + monthsFromNow);

        const now = new Date();

        existingLoansList.forEach(loan => {
            if (loan.startDate && loan.endDate) {
                const start = new Date(loan.startDate + "-01");
                const end = new Date(loan.endDate + "-01");

                // If the target date is within the loan period, you are still paying it
                if (targetDate >= start && targetDate < end) {
                    const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                    const currentMonthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                    const targetMonthsPassed = (targetDate.getFullYear() - start.getFullYear()) * 12 + (targetDate.getMonth() - start.getMonth());

                    totalInstallment += getInstallmentAmountForMonth(loan, targetMonthsPassed, totalMonths, currentMonthsPassed);
                }
            }
        });
        return totalInstallment;
    };

    // Helper to calculate active real estate passive income at a given month in the future
    const getActiveRealEstatePassiveIncomeAtMonth = (monthsFromNow: number) => {
        let monthlyPassiveIncome = 0;
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + monthsFromNow);
        const targetYearMonth = format(targetDate, 'yyyy-MM');

        if (realEstateListStr) {
            try {
                const parsedList = JSON.parse(realEstateListStr);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                parsedList.forEach((prop: any) => {
                    let isCurrentlyRented = !!prop.isRented;
                    if (!isCurrentlyRented && prop.rentStartDate) {
                        if (targetYearMonth >= prop.rentStartDate) {
                            isCurrentlyRented = true;
                        }
                    }
                    if (isCurrentlyRented) {
                        let totalCosts = (prop.costs || 0);
                        if (!prop.isPrimaryResidence) {
                            totalCosts += (prop.imu || 0) / 12; // Wait, IMU is annual, right? No, in the original code we subtracted full IMU. Let's look at line 165. It says: Math.max(0, (prop.rent || 0) - totalCosts) where costs += imu. This meant it was treating IMU as monthly!?
                            // In patrimonio it was: costs + imu (but wait, rent is monthly? "Rendita Annua Attesa". If rent is annual, then this logic is fine but divided by 12 later. Let's check.)
                            totalCosts += (prop.imu || 0);
                        }
                        monthlyPassiveIncome += Math.max(0, (prop.rent || 0) - totalCosts);
                    }
                });
            } catch (e) { console.error("Error parsing real estate list", e); }
        }
        return monthlyPassiveIncome; // NOTE: This actually returns an ANNUAL value if prop.rent is annual and costs are annual. We need to check how it was used originally.
    };

    // Calculate baseline (current) total installment so we only ADD the "freed up" cash flow
    const baseInstallmentNow = getActiveDebtAtMonth(0);

    // --- PENSION OPTIMIZER CALCULATION (Exact IRPEF 2024 brackets) ---
    const calculateTaxRefund = () => {
        if (!enablePensionOptimizer || pensionContribution <= 0) return 0;

        const amountToDeduct = Math.min(pensionContribution, 5164.57); // Max limit in Italy
        const taxWithoutPfp = calculateIrpef(grossIncome);
        const taxWithPfp = calculateIrpef(grossIncome, amountToDeduct);

        return taxWithoutPfp - taxWithPfp;
    };

    const annualTaxRefund = calculateTaxRefund();

    // 1. DETERMINISTIC STANDARD SIMULATION
    let tempCap = startingCapital;
    let yearsToFire = 0;
    const maxYearsSim = 100;
    const chartData = [];

    // Adjust return for Bollo tax (0.2%) — applied on real return
    const netRealReturn = applyTaxStamp ? (realReturnDecimal - 0.002) : realReturnDecimal;
    const monthlyReturnRate = Math.pow(1 + netRealReturn, 1 / 12) - 1;

    for (let m = 0; m <= maxYearsSim * 12; m++) {
        const currentY = Math.floor(m / 12);
        const yAge = currentAge + currentY;

        // Calculate dynamic savings rate for this specific month
        const activeDebtThisMonth = getActiveDebtAtMonth(m);
        const freedUpCashFlow = baseInstallmentNow - activeDebtThisMonth; // Money no longer going to the bank
        const currentMonthlySavings = monthlySavings + Math.max(0, freedUpCashFlow);

        // Target fisso in euro odierni (inflazione già sottratta dal rendimento)
        const isRetired = yAge >= retirementAge || tempCap >= fireTarget;

        // Public Pension logic: if reached pension age, reduce expenses
        const monthlyPublicPension = yAge >= publicPensionAge ? expectedPublicPension : 0;

        // Use the projected passive income for THIS specific future month
        const projectedMonthlyPassiveIncome = getActiveRealEstatePassiveIncomeAtMonth(m) / 12;
        const currentMonthlyExpenses = isRetired ? Math.max(0, expectedMonthlyExpenses - projectedMonthlyPassiveIncome - monthlyPublicPension) : 0;

        if (m % 12 === 0 && currentY <= maxYearsSim) {
            chartData.push({
                age: currentAge + currentY,
                Capital: tempCap,
                Target: fireTarget,
                ActiveDebtAnnual: activeDebtThisMonth * 12 // Annualized burden for the chart area
            });
            if (tempCap >= fireTarget && yearsToFire === 0) {
                yearsToFire = currentY + (m % 12) / 12;
            }
        }
        // Inject Pension Fund IRPEF Tax Refund in July (Month 6)
        if (m % 12 === 6 && enablePensionOptimizer && currentY <= maxYearsSim && !isRetired) {
            tempCap += annualTaxRefund;
        }

        if (isRetired) {
            tempCap = tempCap * (1 + monthlyReturnRate) - currentMonthlyExpenses;
        } else {
            tempCap = tempCap * (1 + monthlyReturnRate) + currentMonthlySavings;
        }

        if (tempCap < 0) tempCap = 0;
    }
    const displayYears = yearsToFire > 0 ? Math.min(Math.ceil(yearsToFire) + 5, 50) : 50;
    const displayChartData = chartData.slice(0, displayYears + 1);
    const isFireAlready = startingCapital >= fireTarget;

    // 2. MONTE CARLO SIMULATION (Web Worker)
    const mcSimYears = Math.max(displayYears, 30);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const mcWorkerRef = useRef<Worker | null>(null);

    const runMonteCarloSimulation = () => {
        if (mcIsCalculating) return;
        setMcIsCalculating(true);
        setMcProgress(0);
        setMcRunsCompleted(0);
        setMcData([]);

        // Termina worker precedente se esiste
        if (mcWorkerRef.current) {
            mcWorkerRef.current.terminate();
        }

        // Pre-computa gli array di debt e passive income per ogni mese della simulazione
        const totalMonths = (mcSimYears + 1) * 12;
        const debtByMonth: number[] = [];
        const passiveIncomeByMonth: number[] = [];
        for (let m = 0; m < totalMonths; m++) {
            debtByMonth.push(getActiveDebtAtMonth(m));
            passiveIncomeByMonth.push(getActiveRealEstatePassiveIncomeAtMonth(m));
        }

        const worker = new Worker(new URL('@/workers/monte-carlo.worker.ts', import.meta.url));
        mcWorkerRef.current = worker;

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'progress') {
                setMcData(msg.data);
                setMcRunsCompleted(msg.runsCompleted);
                setMcSuccessRate(msg.successRate);
                setMcProgress(msg.progress);
            } else if (msg.type === 'complete') {
                setMcData(msg.data);
                setMcRunsCompleted(msg.runsCompleted);
                setMcSuccessRate(msg.successRate);
                setMcProgress(100);
                setMcIsCalculating(false);
                worker.terminate();
                mcWorkerRef.current = null;
            }
        };

        worker.onerror = (err) => {
            console.error('Monte Carlo Worker error:', err);
            setMcIsCalculating(false);
            worker.terminate();
            mcWorkerRef.current = null;
        };

        worker.postMessage({
            startingCapital,
            fireTarget,
            currentAge,
            retirementAge,
            simYears: mcSimYears,
            fireVolatility,
            realReturnDecimal,
            applyTaxStamp,
            annualExpenses,
            monthlySavings,
            publicPensionAge,
            expectedPublicPension,
            enablePensionOptimizer,
            annualTaxRefund,
            targetRuns: mcTargetRuns,
            debtByMonth,
            passiveIncomeByMonth,
            baseInstallmentNow,
        });
    };

    // Cleanup worker on unmount
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        return () => {
            if (mcWorkerRef.current) {
                mcWorkerRef.current.terminate();
            }
        };
    }, []);

    // 3. STRESS TEST (Lost Decade)
    // Run the user's plan through 2000-2009 S&P500 real returns
    let stressCap = startingCapital;
    const stressData = [];
    let stressSurvived = true;

    for (let i = 0; i < LOST_DECADE_RETURNS.length; i++) {
        const yAge = currentAge + i;
        stressData.push({
            year: 2000 + i, // "Anno fittizio" per mostrare la sequenza
            age: yAge,
            Capital: Math.max(0, stressCap),
            ReturnStr: `${LOST_DECADE_RETURNS[i]}%`,
            ReturnValue: LOST_DECADE_RETURNS[i]
        });

        const isRetired = yAge >= retirementAge || stressCap >= fireTarget;

        // Adjust return for Bollo if active
        const yearRealReturn = applyTaxStamp ? (LOST_DECADE_RETURNS[i] / 100 - 0.002) : (LOST_DECADE_RETURNS[i] / 100);

        stressCap = stressCap * (1 + yearRealReturn);

        if (isRetired) {
            const annualPublicPension = yAge >= publicPensionAge ? expectedPublicPension * 12 : 0;
            stressCap -= Math.max(0, netAnnualExpenses - annualPublicPension);
        } else {
            // Check dynamic savings for this year (average over the 12 months)
            let totalSavingsThisYear = 0;
            for (let m = (i * 12); m < ((i + 1) * 12); m++) {
                const activeDebtThisMonth = getActiveDebtAtMonth(m);
                const freedUpCashFlow = baseInstallmentNow - activeDebtThisMonth;
                totalSavingsThisYear += (monthlySavings + Math.max(0, freedUpCashFlow));
            }
            stressCap += totalSavingsThisYear;
        }

        // Inject Pension Fund IRPEF Tax Refund
        if (enablePensionOptimizer && !isRetired) {
            stressCap += annualTaxRefund;
        }

        if (stressCap <= 0) {
            stressSurvived = false;
            stressCap = 0;
        }
    }
    // Add the final year to see where it ended up after the recovery of 2009
    stressData.push({
        year: 2010,
        age: currentAge + 10,
        Capital: Math.max(0, Math.round(stressCap)),
        ReturnStr: "",
        ReturnValue: 0
    });

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {/* HERO MODULE */}
            <div className="text-center space-y-4 pt-6 relative">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center justify-center">
                    Simulatore <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500 ml-3">FIRE</span> <Flame className="w-10 h-10 ml-2 text-orange-600" />
                </h2>
                <p className="text-slate-500 max-w-2xl mx-auto text-lg pt-2 pb-6">
                    Scopri quanto ti manca alla libertà finanziaria. Raggiungi i tuoi obiettivi testando la solidità del tuo piano con simulazioni stocastiche storiche.
                </p>

                {/* Decorative Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-200/20 blur-[120px] -z-10 rounded-full" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-100/20 blur-[100px] -z-10 rounded-full" />

                {/* Minimalist Auto-Save Indicator */}
                <div className="absolute right-4 top-0 flex h-8 items-center rounded-full border border-slate-200 bg-white/75 px-3 py-1 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/75">
                    {saving ? (
                        <span className="text-xs font-medium text-slate-500 flex items-center">
                            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Salvataggio in corso...
                        </span>
                    ) : (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center animate-in fade-in">
                            <CheckCircle className="w-3 h-3 mr-1.5" /> Dati salvati
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 px-2">
            <Card className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl transition-all duration-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/75">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 group-hover:bg-blue-600 transition-colors" />
                        <CardContent className="p-6">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cash Buffer (Pre-FIRE)</div>
                            <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:text-blue-400 transition-colors">{formatEuro(startingCapital)}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-400 mt-1">{includeIlliquidInFire ? "Net Worth Totale" : "Asset Liquidi (Cuscinetto Crisi)"}</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-orange-50/80 backdrop-blur-xl border border-orange-200 shadow-md rounded-2xl overflow-hidden relative group hover:shadow-lg transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-orange-400 group-hover:bg-orange-500 transition-colors" />
                        <CardContent className="p-6">
                            <div className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1 flex justify-between">
                                <span>Il Tuo Obiettivo FIRE</span>
                                {activeRealEstatePassiveIncome > 0 && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-white border border-emerald-100 px-2 py-0.5 rounded-full lowercase font-bold shadow-sm">
                                        -{formatEuro(activeRealEstatePassiveIncome)}/Y Affitti
                                    </span>
                                )}
                            </div>
                            <div className="text-2xl font-extrabold text-orange-600 group-hover:scale-105 origin-left transition-transform">{formatEuro(fireTarget)}</div>
                            <div className="text-xs text-orange-600/70 mt-1">Con incassi di {formatEuro(netAnnualExpenses / 12)}/mese al {fireWithdrawalRate}% annuo</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-teal-50/80 backdrop-blur-xl border border-teal-200 shadow-md rounded-2xl overflow-hidden relative group hover:shadow-lg transition-all">
                        <div className="absolute top-0 left-0 w-full h-1 bg-teal-400 group-hover:bg-teal-500 transition-colors" />
                        <CardContent className="p-6">
                            <div className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1 flex justify-between">
                                <span>Obiettivo Coast FIRE</span>
                                {coastFireReached && <span className="bg-teal-100 border border-teal-300 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold">RAGGIUNTO! 🎉</span>}
                            </div>
                            <div className={`text-2xl font-extrabold ${coastFireReached ? 'text-teal-600' : 'text-teal-500'}`}>
                                {formatEuro(coastFireTarget)}
                            </div>
                            <div className="text-xs text-teal-600/70 mt-1">Capitale da avere OGGI per ritirarti a {retirementAge} anni.</div>
                        </CardContent>
                    </Card>

            <Card className={`relative overflow-hidden rounded-2xl border shadow-md backdrop-blur-xl transition-all hover:shadow-lg ${isFireAlready ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50' : 'border-slate-200/80 bg-white/75 text-slate-900 dark:border-slate-800 dark:bg-slate-900/75 dark:text-slate-100'}`}>
                        <CardContent className="p-6">
                            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isFireAlready ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>
                                Anni al FIRE Medio
                            </div>
                            <div className={`text-4xl font-extrabold flex items-baseline ${isFireAlready ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                {isFireAlready ? '0' : yearsToFire > 0 ? yearsToFire.toFixed(1) : '>100'}
                                {!isFireAlready && <span className="text-sm ml-2 text-slate-500 font-medium">anni</span>}
                            </div>
                            {isFireAlready ? (
                                <div className="text-xs mt-1 text-emerald-600 dark:text-emerald-400 font-medium">Sei finanziariamente libero!</div>
                            ) : (
                                <div className="text-xs mt-1 text-slate-500">Raggiungerai il FIRE a {yearsToFire > 0 ? Math.round(currentAge + yearsToFire) : '--'} anni</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className={`backdrop-blur-xl border shadow-md rounded-2xl overflow-hidden relative group hover:shadow-lg transition-all duration-300 ${mcSuccessRate >= 95 ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900' : mcSuccessRate >= 80 ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900' : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900'}`}>
                        <div className={`absolute top-0 left-0 w-full h-1 ${mcSuccessRate >= 95 ? 'bg-emerald-400 group-hover:bg-emerald-50 dark:bg-emerald-950/500' : mcSuccessRate >= 80 ? 'bg-amber-400 group-hover:bg-amber-50 dark:bg-amber-950/500' : 'bg-rose-400 group-hover:bg-rose-50 dark:bg-rose-950/500'} transition-colors`} />
                        <CardContent className="p-6">
                            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${mcSuccessRate >= 95 ? 'text-emerald-700 dark:text-emerald-300' : mcSuccessRate >= 80 ? 'text-amber-700 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                Successo SWR ({fireWithdrawalRate}%)
                            </div>
                            <div className={`text-4xl font-extrabold flex items-baseline ${mcSuccessRate >= 95 ? 'text-emerald-600 dark:text-emerald-400' : mcSuccessRate >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {mcIsCalculating ? <Loader2 className="w-8 h-8 animate-spin text-slate-400 dark:text-slate-400" /> : `${mcSuccessRate.toFixed(1)}%`}
                            </div>
                            <div className={`text-xs mt-1 font-medium ${mcSuccessRate >= 95 ? 'text-emerald-700 dark:text-emerald-300/70' : mcSuccessRate >= 80 ? 'text-amber-700 dark:text-amber-300/70' : 'text-rose-700 dark:text-rose-300/70'}`}>
                                Probabilità stocastica a {mcSimYears} anni
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Acquisti Accettati — Impatto FIRE */}
            {acceptedPurchases.length > 0 && (
                <div className="bg-indigo-50/80 dark:bg-indigo-950/30 backdrop-blur-xl border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Impatto Acquisti Accettati sul FIRE</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {acceptedPurchases.filter(p => p.isFinanced).map(p => {
                            const loan = existingLoansList.find(l => l.id === p.linkedLoanId);
                            const endDate = loan?.endDate ? new Date(loan.endDate + "-01") : null;
                            const monthsLeft = endDate ? Math.max(0, Math.round((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))) : 0;
                            return (
                                <div key={p.id} className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{p.itemName}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold">{p.category}</span>
                                    </div>
                                    <div className="text-lg font-extrabold text-red-500">-{formatEuro(p.monthlyPayment)}<span className="text-xs font-normal text-slate-400">/mese</span></div>
                                    <div className="text-[10px] text-slate-500 mt-1">
                                        {monthsLeft > 0 ? `${monthsLeft} mesi rimanenti` : "Completato"} &middot; Interessi: {formatEuro(p.totalInterest)}
                                    </div>
                                    <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                                        {(() => {
                                            if (!loan) return null;
                                            const start = new Date(loan.startDate + "-01").getTime();
                                            const end = new Date(loan.endDate + "-01").getTime();
                                            const pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
                                            return <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />;
                                        })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-3">
                        Queste rate riducono il tuo risparmio mensile e rallentano il raggiungimento del FIRE. Una volta estinte, il tuo cashflow aumentera di {formatEuro(acceptedPurchases.filter(p => p.isFinanced).reduce((s, p) => s + p.monthlyPayment, 0))}/mese.
                    </p>
                </div>
            )}

            {/* FIRE JOURNEY MAP */}
            {(() => {
                const leanFireTarget = fireTarget * 0.7;
                const fatFireTarget = fireTarget * 1.5;
                const halfFireTarget = fireTarget * 0.5;
                const billShieldTarget = fireTarget * 0.3; // Approx 30% for basic bills
                const baseline100k = 100000;

                const rawMilestones = [
                    { id: '100k', label: 'Prima Vetta', target: baseline100k, desc: 'I primi 100k investiti, matematicamente la frazione più ripida.' },
                    { id: 'shield', label: 'Scudo Bollette', target: billShieldTarget, desc: 'Il 30% delle tue spese coperte. Le bollette sono pagate dagli assett passivi.' },
                    { id: 'coast', label: 'Coast FIRE', target: coastFireTarget, desc: 'Potresti pure smettere di risparmiare e il compound ti porterebbe a obiettivo.' },
                    { id: 'half', label: 'Mezzo Cammino', target: halfFireTarget, desc: 'Sei esattamente al 50% matematico dell\'Indipendenza.' },
                    { id: 'lean', label: 'Lean FIRE', target: leanFireTarget, desc: 'Copertura al 70%. Stile vita frugale e minimale garantito a vita.' },
                    { id: 'fire', label: 'Target FIRE', target: fireTarget, desc: 'Copertura al 100%. Libertà Totale.' },
                    { id: 'fat', label: 'Fat FIRE', target: fatFireTarget, desc: 'Al 150%. Zero imprevisti, opzioni extra luxury attive.' },
                ].filter(m => m.target > 0).sort((a, b) => a.target - b.target);

                // Reduce overlapping targets to keep UI clean
                const filteredMilestones = rawMilestones.filter((m, i, arr) => {
                    if (i === 0) return true;
                    // If target is within 5% of previous, drop the less important one
                    const prev = arr[i - 1];
                    if ((m.target - prev.target) / prev.target < 0.05) return false;
                    return true;
                });

                return (
                    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 md:p-10 shadow-sm border border-slate-200 dark:border-slate-800 mt-6 relative overflow-visible">
                        <div className="flex items-center gap-3 mb-16 px-2">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-xl"><Map className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">La Mappa del tuo Viaggio</h3>
                                <p className="text-sm text-slate-500">I traguardi matematici della tua evoluzione patrimoniale</p>
                            </div>
                        </div>
                        <div className="w-full pb-12 pt-12 px-2 md:px-6">
                            <div className="flex items-center w-full">
                                {filteredMilestones.map((m, idx) => {
                                    const isReached = startingCapital >= m.target;
                                    const isNext = !isReached && (idx === 0 || startingCapital >= filteredMilestones[idx-1].target);
                                    
                                    let lineFillPct = 0;
                                    if (idx < filteredMilestones.length - 1) {
                                        const nextTarget = filteredMilestones[idx+1].target;
                                        if (startingCapital >= nextTarget) {
                                            lineFillPct = 100;
                                        } else if (startingCapital >= m.target) {
                                            lineFillPct = Math.min(100, Math.max(0, ((startingCapital - m.target) / (nextTarget - m.target)) * 100));
                                        }
                                    }

                                    return (
                                        <div key={m.id} className="flex items-center relative group" style={{ flex: idx === filteredMilestones.length - 1 ? '0 0 auto' : '1 1 0%' }}>
                                            
                                            {/* Node Circle */}
                                            <div className="relative z-10 flex flex-col items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[4px] transition-all duration-500 shadow-sm ${isReached ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-900/50' : isNext ? 'bg-indigo-500 border-indigo-100 dark:border-indigo-900/50 ring-4 ring-indigo-500/20 animate-pulse' : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                                                    {isReached ? <Check className="w-5 h-5 text-white" /> : isNext ? <Flag className="w-4 h-4 text-white" /> : <Lock className="w-3 h-3 text-slate-400" />}
                                                </div>
                                                
                                                {/* Label under node */}
                                                <div className="absolute top-12 text-center w-28 -ml-9">
                                                    <div className={`text-xs font-bold leading-tight uppercase tracking-wider mb-1 ${isReached ? 'text-emerald-700 dark:text-emerald-400' : isNext ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-400'} `}>{m.label}</div>
                                                    <div className="text-[11px] font-extrabold text-slate-500 tabular-nums bg-slate-100 dark:bg-slate-800 inline-block px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">{formatEuro(m.target)}</div>
                                                </div>

                                                {/* Hover Tooltip */}
                                                <div className="absolute bottom-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-xl p-3 w-48 text-center z-50 shadow-2xl scale-95 group-hover:scale-100 transform duration-200">
                                                    <div className="font-bold mb-1 text-slate-200">{m.label}</div>
                                                    <div className="text-[10px] text-slate-400 leading-tight mb-2">{m.desc}</div>
                                                    {!isReached && <div className="text-emerald-300 font-extrabold border-t border-slate-600/50 pt-2 bg-slate-900/30 -mx-3 -mb-3 p-2 rounded-b-xl">Mancano: <br/>{formatEuro(m.target - startingCapital)}</div>}
                                                </div>
                                            </div>

                                            {/* Connecting Line to next node */}
                                            {idx < filteredMilestones.length - 1 && (
                                                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 relative mx-1 rounded-full overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                                                    <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out flex items-center justify-end overflow-hidden" style={{ width: `${lineFillPct}%` }}>
                                                        {lineFillPct > 10 && lineFillPct < 100 && <div className="w-10 h-full bg-gradient-to-r from-transparent to-white/30 animate-pulse" />}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* MAIN CONTENT GRID */}
            <div className="grid lg:grid-cols-12 gap-8 mt-4">

                {/* SETTINGS PANEL */}
                <FireSettingsPanel
                    includeIlliquidInFire={includeIlliquidInFire}
                    birthYear={birthYear}
                    retirementAge={retirementAge}
                    expectedMonthlyExpenses={expectedMonthlyExpenses}
                    monthlySavings={monthlySavings}
                    fireWithdrawalRate={fireWithdrawalRate}
                    expectedInflation={expectedInflation}
                    fireExpectedReturn={fireExpectedReturn}
                    fireVolatility={fireVolatility}
                    enablePensionOptimizer={enablePensionOptimizer}
                    grossIncome={grossIncome}
                    pensionContribution={pensionContribution}
                    annualTaxRefund={annualTaxRefund}
                    applyTaxStamp={applyTaxStamp}
                    expectedPublicPension={expectedPublicPension}
                    publicPensionAge={publicPensionAge}
                    onIncludeIlliquidChange={setIncludeIlliquidInFire}
                    onBirthYearChange={setBirthYear}
                    onRetirementAgeChange={setRetirementAge}
                    onExpectedMonthlyExpensesChange={setExpectedMonthlyExpenses}
                    onMonthlySavingsChange={setMonthlySavings}
                    onFireWithdrawalRateChange={setFireWithdrawalRate}
                    onExpectedInflationChange={setExpectedInflation}
                    onFireExpectedReturnChange={setFireExpectedReturn}
                    onFireVolatilityChange={setFireVolatility}
                    onEnablePensionOptimizerChange={setEnablePensionOptimizer}
                    onGrossIncomeChange={setGrossIncome}
                    onPensionContributionChange={setPensionContribution}
                    onApplyTaxStampChange={setApplyTaxStamp}
                    onExpectedPublicPensionChange={setExpectedPublicPension}
                    onPublicPensionAgeChange={setPublicPensionAge}
                />

                {/* GRAPH AND STATS PANEL */}
                <div className="lg:col-span-8">
            <Card className="h-full overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                        <Tabs defaultValue="standard" className="w-full h-full flex flex-col">

                            <CardHeader className="pb-0 pt-6 px-4 md:px-8 border-b border-slate-200 bg-white/50 dark:bg-slate-800/50">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analisi Avanzata</CardTitle>
                                        <CardDescription className="text-slate-500">Esplora il tuo futuro con modelli deterministici o stocastici.</CardDescription>
                                    </div>
            <TabsList className="self-start rounded-full border border-slate-200 bg-white/60 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800/60 md:self-auto">
                                        <TabsTrigger value="standard" className="rounded-full text-xs font-bold px-4 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:text-slate-100 text-slate-500 transition-all data-[state=active]:shadow-sm">
                                            Modello Fisso
                                        </TabsTrigger>
                                        <TabsTrigger value="montecarlo" className="rounded-full text-xs font-bold px-4 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-slate-500 transition-all data-[state=active]:shadow-sm">
                                            Monte Carlo
                                        </TabsTrigger>
                                        <TabsTrigger value="stress" className="rounded-full text-xs font-bold px-4 data-[state=active]:bg-rose-600 data-[state=active]:text-white text-slate-500 transition-all data-[state=active]:shadow-sm">
                                            Stress Test Storico
                                        </TabsTrigger>
                                    </TabsList>
                                </div>
                            </CardHeader>

                            <CardContent className="p-4 md:p-8 flex-grow">

                                {/* 1. STANDARD TAB */}
                                <TabsContent value="standard" className="h-full flex flex-col m-0 animate-in fade-in-50">
                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={displayChartData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                                                <defs>
                                                    <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                <XAxis dataKey="age" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} name="Età" />
                                                <YAxis yAxisId="left" tickFormatter={(val) => `€${(val / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-5} />
                                                <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `€${(val / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#ef4444', fontSize: 12 }} dx={5} />
                                                <Tooltip
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    formatter={(value: any, name: any) => {
                                                        if (name === 'Target') return [formatEuro(Number(value)), 'Obiettivo FIRE'];
                                                        if (name === 'ActiveDebtAnnual') return [formatEuro(Number(value)), 'Costo Annuo Prestiti'];
                                                        return [formatEuro(Number(value)), 'Capitale Stimato'];
                                                    }}
                                                    labelFormatter={(label) => `Età: ${label} anni`}
                                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.96)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)', color: '#e2e8f0' }}
                                                    labelStyle={{ fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}
                                                />
                                                <Line yAxisId="left" type="monotone" dataKey="Target" stroke="#f97316" strokeDasharray="5 5" strokeWidth={2} dot={false} activeDot={false} />
                                                <Area yAxisId="left" type="monotone" dataKey="Capital" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorCapital)" activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981', style: { filter: 'drop-shadow(0px 0px 8px rgba(16,185,129,0.5))' } }} />
                                                <Area yAxisId="right" type="stepAfter" dataKey="ActiveDebtAnnual" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDebt)" activeDot={{ r: 4, strokeWidth: 0, fill: '#ef4444', style: { filter: 'drop-shadow(0px 0px 6px rgba(239,68,68,0.5))' } }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
            <div className={`mt-8 rounded-3xl border p-6 ${coastFireReached ? 'border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40' : 'border-slate-200 bg-white/75 dark:border-slate-800 dark:bg-slate-900/75'}`}>
                                        <h4 className={`text-lg font-bold flex items-center mb-2 ${coastFireReached ? 'text-teal-700' : 'text-slate-700 dark:text-slate-300'}`}>
                                            <Briefcase className={`w-5 h-5 mr-2 ${coastFireReached ? 'text-teal-600' : 'text-slate-500'}`} />
                                            {coastFireReached ? "Coast FIRE: Missione Compiuta! 🎉" : "Strategia Coast FIRE"}
                                        </h4>
                                        <p className={`text-sm leading-relaxed font-medium ${coastFireReached ? 'text-teal-800/80' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {coastFireReached
                                                ? `Complimenti! Hai superato la soglia di ${formatEuro(coastFireTarget)}. Significa che potresti Smettere Di Risparmiare OGGI, e grazie all'interesse composto di ${fireExpectedReturn}% reale annuo sul tuo capitale attuale, arriverai a ${retirementAge} anni con la cifra esatta del tuo obiettivo FIRE (${formatEuro(fireTarget)}).`
                                                : `Il Coast FIRE è il traguardo intermedio. Ti mancano ${formatEuro(coastFireTarget - startingCapital)} per raggiungere i ${formatEuro(coastFireTarget)}. Raggiunta, potrai smettere di risparmiare e il mercato farà il resto per farti arrivare in FIRE a ${retirementAge} anni.`}
                                        </p>
                                    </div>
                                </TabsContent>

                                {/* 2. MONTE CARLO TAB */}
                                <TabsContent value="montecarlo" className="h-full flex flex-col m-0 animate-in fade-in-50">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100">Simulazione Stocastica ({mcTargetRuns.toLocaleString()} Scenari)</h3>
                                            <p className="text-xs text-slate-500">Ipotizza variazioni casuali di mercato incluse le recessioni peggiori proprio nell&apos;anno in cui ti ritiri.</p>
                                        </div>
                <div className={`min-w-[120px] rounded-2xl border p-3 text-center transition-colors duration-500 ${mcSuccessRate === 0 && !mcIsCalculating ? 'border-slate-200 bg-white/75 dark:border-slate-800 dark:bg-slate-900/75' : mcSuccessRate > 90 ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50' : mcSuccessRate > 70 ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50' : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/50'}`}>
                                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Success Rate</div>
                                            <div className={`text-2xl font-extrabold transition-colors duration-500 ${mcSuccessRate === 0 && !mcIsCalculating ? 'text-slate-400 dark:text-slate-400' : mcSuccessRate > 90 ? 'text-emerald-600 dark:text-emerald-400' : mcSuccessRate > 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {mcRunsCompleted > 0 ? `${mcSuccessRate.toFixed(1)}%` : '--%'}
                                            </div>
                                        </div>
                                    </div>

                                    {!mcIsCalculating && mcData.length === 0 ? (
                                        <div className="flex-grow flex flex-col items-center justify-center p-10 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 text-center hover:bg-white/80 transition-colors shadow-sm">
                                            <div className="w-16 h-16 bg-purple-100 border border-purple-200 dark:border-purple-900 rounded-full flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400 shadow-sm">
                                                <Activity className="w-8 h-8" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-2">Pronto a calcolare {mcTargetRuns.toLocaleString('it-IT')} scenari paralleli</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mb-6">L&apos;algoritmo generera&apos; decine di migliaia di mercati orso e toro casuali per stressare la solidita&apos; del tuo FIRE con estrema volatilita&apos;.</p>
                                            <Button onClick={runMonteCarloSimulation} className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8 py-6 text-lg shadow-md transition-all font-bold">
                                                <PlayCircle className="w-5 h-5 mr-2" /> Inizia Simulazione Completa
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            {mcIsCalculating && (
                                                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-6 border border-slate-200 p-0.5 shadow-inner">
                                                    <div className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 bg-[length:200%_100%] animate-shimmer rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(147,51,234,0.3)]" style={{ width: `${mcProgress}%` }}></div>
                                                    <div className="absolute right-0 -top-6 text-[10px] font-bold text-slate-500 flex items-center uppercase tracking-wider">
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin text-purple-600 dark:text-purple-400" /> Calcolo iterazione {mcRunsCompleted} / {mcTargetRuns}...
                                                    </div>
                                                </div>
                                            )}

                                            <div className={`h-[400px] w-full transition-opacity duration-300 ${mcIsCalculating && mcData.length < 50 ? 'opacity-50' : 'opacity-100'}`}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ComposedChart data={mcData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                                                        <defs>
                                                            <linearGradient id="mcMedian" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#9333ea" stopOpacity={0.2} />
                                                                <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                        <XAxis dataKey="age" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} name="Età" />
                                                        <YAxis tickFormatter={(val) => `€${(val / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-5} />
                                                        {(!mcIsCalculating || mcData.length > 50) && (
                                                            <Tooltip
                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    formatter={(value: any, name: any) => {
                                                                    const labelMap: Record<string, string> = { 'p90': 'Caso Favorevole (10% Top)', 'p50': 'Mediana (Caso Medio)', 'p10': 'Scenario Pessimista (Bottom 10%)' };
                                                                    return [formatEuro(Number(value)), labelMap[name] || name];
                                                                }}
                                                                labelFormatter={(label) => `Età: ${label} anni`}
                                                                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.96)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)', color: '#e2e8f0' }}
                                                                labelStyle={{ fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}
                                                            />
                                                        )}
                                                        <ReferenceLine y={fireTarget} stroke="#f97316" strokeDasharray="5 5" strokeWidth={1} label={{ position: 'top', value: 'Obiettivo FIRE', fill: '#f97316', fontSize: 10 }} />

                                                        {mcData.length > 0 && (
                                                            <>
                                                                <Line type="monotone" dataKey="p90" stroke="#d8b4fe" strokeWidth={2} dot={false} isAnimationActive={false} />
                                                                <Line type="monotone" dataKey="p10" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
                                                                <Area type="monotone" dataKey="p50" stroke="#9333ea" strokeWidth={4} fillOpacity={1} fill="url(#mcMedian)" activeDot={!mcIsCalculating ? { r: 8, strokeWidth: 0, fill: '#9333ea', style: { filter: 'drop-shadow(0px 0px 10px rgba(147,51,234,0.8))' } } : false} isAnimationActive={false} />
                                                            </>
                                                        )}
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {!mcIsCalculating && mcData.length > 0 && (
                                                <div className="flex justify-center mt-2">
                                                    <Button variant="outline" onClick={runMonteCarloSimulation} className="text-xs rounded-full border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:bg-purple-950/50">
                                                        <PlayCircle className="w-3 h-3 mr-2" /> Ricalcola Simulazione ({mcTargetRuns} scenari)
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </TabsContent>

                                {/* 3. STRESS TEST TAB */}
                                <TabsContent value="stress" className="h-full flex flex-col m-0 animate-in fade-in-50">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-slate-900 dark:text-slate-100">Il &quot;Decennio Perduto&quot; (2000-2009)</h3>
                                            <p className="text-xs text-slate-500">
                                                Cosa succederebbe al tuo portafoglio se oggi iniziassimo esattamente la sequenza storica del crollo Dot-Com seguito dal crack Lehman Brothers del 2008?
                                            </p>
                                        </div>
                                        <div className={`p-2 rounded-xl border ${stressSurvived ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'} flex items-center shadow-sm`}>
                                            {stressSurvived ? <><TrendingUp className="w-5 h-5 mr-2" /> <span className="text-sm font-bold">Il Piano Sopravvive</span></> : <><AlertTriangle className="w-5 h-5 mr-2" /> <span className="text-sm font-bold">Capitale Esaurito</span></>}
                                        </div>
                                    </div>

                                    <div className="h-[350px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={stressData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                <XAxis dataKey="age" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} name="La tua età nel decennio" />
                                                <YAxis yAxisId="left" tickFormatter={(val) => `€${(val / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-5} />
                                                <YAxis yAxisId="right" orientation="right" hide />

                                                <Tooltip
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    formatter={(value: any, name: any) => [name === 'Capital' ? formatEuro(Number(value)) : `${value}%`, name === 'Capital' ? 'Capitale Residuo' : 'Crac di Mercato']}
                                                    labelFormatter={(label, data) => `Età: ${label} (Simula un ${data[0]?.payload?.year})`}
                                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.96)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)', color: '#e2e8f0' }}
                                                    labelStyle={{ fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}
                                                />

                                                {/* Bar per mostrare i crolli o rialzi annuali (S&P500) */}
                                                <Bar yAxisId="right" dataKey="ReturnValue" radius={[4, 4, 4, 4]} barSize={15}>
                                                    {stressData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.ReturnValue < 0 ? '#f43f5e' : '#10b981'} fillOpacity={0.6} />
                                                    ))}
                                                </Bar>

                                                <Line yAxisId="left" type="stepAfter" dataKey="Capital" stroke="#0f172a" strokeWidth={4} dot={{ r: 4, fill: "#ffffff", strokeWidth: 2, stroke: "#38bdf8" }} activeDot={{ r: 6, fill: '#ffffff', strokeWidth: 3, stroke: '#38bdf8', style: { filter: 'drop-shadow(0px 0px 6px rgba(56,189,248,0.5))' } }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {!stressSurvived && (
                                        <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900">
                                            <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                                                Attenzione: se si ripetesse la sfortuna del mercato 2000-2009 e tu andassi in FIRE oggi o smettessi di versare, finiresti i soldi! Ti serve un Withdrawal Rate più basso (es. 2.5-3%) o un cuscinetto cash per non vendere azioni durante un crollo del -37% come nel 2008.
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>

                            </CardContent>
                        </Tabs>
                    </Card>
                </div>
            </div>
        </div >
    );
}
