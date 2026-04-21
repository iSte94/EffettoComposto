// Monte Carlo Simulation Web Worker
// Riceve parametri e esegue 10k simulazioni senza bloccare la UI

import { allocatePreRetirementPassiveIncomeAnnual } from "@/lib/finance/coast-fire";

interface MonteCarloParams {
    startingCapital: number;
    fireTargetsByYear: number[];
    currentAge: number;
    retirementAge: number;
    simYears: number;
    fireVolatility: number;
    realReturnDecimal: number;
    applyTaxStamp: boolean;
    annualExpenses: number;
    monthlySavings: number;
    preRetirementPassiveIncomeMode: "percent" | "fixed";
    preRetirementPassiveIncomeSavingsPct: number;
    preRetirementPassiveIncomeSavingsAnnual: number;
    publicPensionAge: number;
    expectedPublicPension: number;
    enablePensionOptimizer: boolean;
    annualTaxRefund: number;
    targetRuns: number;
    // Pre-computed arrays per evitare closure
    debtByMonth: number[]; // getActiveDebtAtMonth per ogni mese
    passiveIncomeByMonth: number[]; // getActiveRealEstatePassiveIncomeAtMonth per ogni mese
    plannedCapitalByMonth: number[];
    plannedNetCashflowByMonth: number[];
    baseInstallmentNow: number;
    // Pension Fund Pot
    currentPensionFundValue: number;
    totalAnnualPensionContribution: number;
    pensionFundAccessAge: number;
    pensionFundExitTaxRate: number;
    pensionExitMode: "annuity" | "hybrid";
    lifeExpectancy: number;
}

interface MonteCarloProgress {
    type: 'progress';
    runsCompleted: number;
    successRate: number;
    progress: number;
    data: Array<{
        age: number;
        p10: number;
        p50: number;
        p90: number;
        Target: number;
    }>;
}

interface MonteCarloComplete {
    type: 'complete';
    runsCompleted: number;
    successRate: number;
    data: Array<{
        age: number;
        p10: number;
        p50: number;
        p90: number;
        Target: number;
    }>;
}

// Box-Muller transform per distribuzione normale
function randomNormal(mean: number, stdDev: number): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
}

self.onmessage = (e: MessageEvent<MonteCarloParams>) => {
    const params = e.data;
    const {
        startingCapital, fireTargetsByYear, currentAge, retirementAge,
        simYears, fireVolatility, realReturnDecimal, applyTaxStamp,
        annualExpenses, monthlySavings,
        preRetirementPassiveIncomeMode, preRetirementPassiveIncomeSavingsPct, preRetirementPassiveIncomeSavingsAnnual,
        publicPensionAge, expectedPublicPension,
        enablePensionOptimizer, annualTaxRefund,
        targetRuns, debtByMonth, passiveIncomeByMonth, plannedCapitalByMonth, plannedNetCashflowByMonth, baseInstallmentNow,
        currentPensionFundValue, totalAnnualPensionContribution,
        pensionFundAccessAge, pensionFundExitTaxRate, pensionExitMode, lifeExpectancy
    } = params;

    const stdDevDecimal = fireVolatility / 100;
    const chunkSize = 500;
    let totalMcSuccessVotes = 0;
    let runsCompleted = 0;
    const allPaths: number[][] = Array(simYears + 1).fill(null).map(() => []);

    const processChunk = () => {
        const currentChunkLimit = Math.min(runsCompleted + chunkSize, targetRuns);

        for (let run = runsCompleted; run < currentChunkLimit; run++) {
            let runCap = startingCapital;
            let runPensionCap = currentPensionFundValue;
            let runPensionAnnuity = 0;
            let runPensionAccessed = false;
            let survived = true;

            for (let y = 0; y <= simYears; y++) {
                allPaths[y].push(runCap);

                // Target FIRE dinamico: se smettessi di lavorare a questa età,
                // quanto capitale netto servirebbe in euro odierni.
                const yAge = currentAge + y;
                const currentFireTarget = fireTargetsByYear[Math.min(y, fireTargetsByYear.length - 1)] ?? 0;
                const isRetired = yAge >= retirementAge || runCap >= currentFireTarget;

                const yearRealReturn = applyTaxStamp ? (realReturnDecimal - 0.002) : realReturnDecimal;
                const randomYearReturn = randomNormal(yearRealReturn, stdDevDecimal);

                runCap = runCap * (1 + randomYearReturn);

                if (isRetired) {
                    const annualPublicPension = yAge >= publicPensionAge ? expectedPublicPension * 12 : 0;

                    let totalPassiveIncomeThisYear = 0;
                    let plannedEventsNetImpactThisYear = 0;
                    for (let m = (y * 12); m < ((y + 1) * 12); m++) {
                        const monthIdx = Math.min(m, passiveIncomeByMonth.length - 1);
                        totalPassiveIncomeThisYear += (passiveIncomeByMonth[monthIdx] || 0) / 12;
                        plannedEventsNetImpactThisYear += (plannedCapitalByMonth[Math.min(m, plannedCapitalByMonth.length - 1)] || 0)
                            + (plannedNetCashflowByMonth[Math.min(m, plannedNetCashflowByMonth.length - 1)] || 0);
                    }
                    const dynamicNetAnnualExpenses = Math.max(0, annualExpenses - totalPassiveIncomeThisYear);
                    runCap -= Math.max(0, dynamicNetAnnualExpenses - annualPublicPension - runPensionAnnuity * 12);
                    runCap += plannedEventsNetImpactThisYear;
                } else {
                    let totalSavingsThisYear = 0;
                    for (let m = (y * 12); m < ((y + 1) * 12); m++) {
                        const monthIdx = Math.min(m, debtByMonth.length - 1);
                        const activeDebtThisMonth = debtByMonth[monthIdx] || 0;
                        const freedUpCashFlow = baseInstallmentNow - activeDebtThisMonth;
                        const passiveIncomeAnnual = passiveIncomeByMonth[Math.min(m, passiveIncomeByMonth.length - 1)] || 0;
                        const savedPassiveIncomeThisMonth = allocatePreRetirementPassiveIncomeAnnual({
                            annualPassiveIncome: passiveIncomeAnnual,
                            mode: preRetirementPassiveIncomeMode,
                            savingsPct: preRetirementPassiveIncomeSavingsPct,
                            savingsAnnual: preRetirementPassiveIncomeSavingsAnnual,
                        }).savingsAnnual / 12;
                        totalSavingsThisYear += (monthlySavings + Math.max(0, freedUpCashFlow) + savedPassiveIncomeThisMonth);
                        totalSavingsThisYear += (plannedCapitalByMonth[Math.min(m, plannedCapitalByMonth.length - 1)] || 0)
                            + (plannedNetCashflowByMonth[Math.min(m, plannedNetCashflowByMonth.length - 1)] || 0);
                    }
                    runCap += totalSavingsThisYear;
                }

                if (enablePensionOptimizer && !isRetired) {
                    runCap += annualTaxRefund;
                }

                // Pension Fund Pot: grows with stochastic return (no bollo)
                if (runPensionCap > 0 || totalAnnualPensionContribution > 0) {
                    const pfRandomReturn = randomNormal(realReturnDecimal, stdDevDecimal); // No bollo
                    runPensionCap = runPensionCap * (1 + pfRandomReturn);
                    if (!isRetired && totalAnnualPensionContribution > 0) {
                        runPensionCap += totalAnnualPensionContribution;
                    }
                    // BUG FIX: prima si usava `yAge === pensionFundAccessAge` (strict
                    // equality) che impediva la liquidazione quando l'eta' di partenza
                    // era gia' oltre l'accesso, o per eta' non intere. Ora si usa un
                    // flag idempotente con confronto >=.
                    if (!runPensionAccessed && yAge >= pensionFundAccessAge && runPensionCap > 0) {
                        const taxRate = Math.min(100, Math.max(0, pensionFundExitTaxRate));
                        const net = runPensionCap * (1 - taxRate / 100);
                        const annuityMonths = Math.max(1, (lifeExpectancy - pensionFundAccessAge) * 12);
                        if (pensionExitMode === "hybrid") {
                            runCap += net * 0.5;
                            runPensionAnnuity = (net * 0.5) / annuityMonths;
                        } else {
                            runPensionAnnuity = net / annuityMonths;
                        }
                        runPensionCap = 0;
                        runPensionAccessed = true;
                    }
                }

                if (runCap < 0) {
                    survived = false;
                    runCap = 0;
                }
            }
            if (survived) totalMcSuccessVotes++;
        }

        runsCompleted = currentChunkLimit;

        // Calcola statistiche parziali
        const currentData = [];
        for (let y = 0; y <= simYears; y++) {
                const sortedCol = [...allPaths[y]].sort((a, b) => a - b);
                const maxIdx = runsCompleted - 1;
                const currentFireTarget = fireTargetsByYear[Math.min(y, fireTargetsByYear.length - 1)] ?? 0;
                currentData.push({
                    age: currentAge + y,
                    p10: Math.round(sortedCol[Math.min(Math.floor(runsCompleted * 0.1), maxIdx)]),
                    p50: Math.round(sortedCol[Math.min(Math.floor(runsCompleted * 0.5), maxIdx)]),
                    p90: Math.round(sortedCol[Math.min(Math.floor(runsCompleted * 0.9), maxIdx)]),
                    Target: currentFireTarget
                });
            }

        const successRate = (totalMcSuccessVotes / runsCompleted) * 100;
        const progress = Math.round((runsCompleted / targetRuns) * 100);

        if (runsCompleted < targetRuns) {
            self.postMessage({
                type: 'progress',
                runsCompleted,
                successRate,
                progress,
                data: currentData
            } satisfies MonteCarloProgress);

            // Continua con il prossimo chunk
            setTimeout(processChunk, 0);
        } else {
            self.postMessage({
                type: 'complete',
                runsCompleted,
                successRate,
                data: currentData
            } satisfies MonteCarloComplete);
        }
    };

    processChunk();
};
