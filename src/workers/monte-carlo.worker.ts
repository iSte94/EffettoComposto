// Monte Carlo Simulation Web Worker
// Riceve parametri e esegue 10k simulazioni senza bloccare la UI

interface MonteCarloParams {
    startingCapital: number;
    fireTarget: number;
    currentAge: number;
    retirementAge: number;
    simYears: number;
    fireVolatility: number;
    realReturnDecimal: number;
    applyTaxStamp: boolean;
    annualExpenses: number;
    monthlySavings: number;
    publicPensionAge: number;
    expectedPublicPension: number;
    enablePensionOptimizer: boolean;
    annualTaxRefund: number;
    targetRuns: number;
    // Pre-computed arrays per evitare closure
    debtByMonth: number[]; // getActiveDebtAtMonth per ogni mese
    passiveIncomeByMonth: number[]; // getActiveRealEstatePassiveIncomeAtMonth per ogni mese
    baseInstallmentNow: number;
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
        startingCapital, fireTarget, currentAge, retirementAge,
        simYears, fireVolatility, realReturnDecimal, applyTaxStamp,
        annualExpenses, monthlySavings,
        publicPensionAge, expectedPublicPension,
        enablePensionOptimizer, annualTaxRefund,
        targetRuns, debtByMonth, passiveIncomeByMonth, baseInstallmentNow
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
            let survived = true;

            for (let y = 0; y <= simYears; y++) {
                allPaths[y].push(runCap);

                // Target fisso in euro odierni (inflazione già sottratta dal rendimento reale)
                const yAge = currentAge + y;
                const isRetired = yAge >= retirementAge || runCap >= fireTarget;

                const yearRealReturn = applyTaxStamp ? (realReturnDecimal - 0.002) : realReturnDecimal;
                const randomYearReturn = randomNormal(yearRealReturn, stdDevDecimal);

                runCap = runCap * (1 + randomYearReturn);

                if (isRetired) {
                    const annualPublicPension = yAge >= publicPensionAge ? expectedPublicPension * 12 : 0;

                    let totalPassiveIncomeThisYear = 0;
                    for (let m = (y * 12); m < ((y + 1) * 12); m++) {
                        const monthIdx = Math.min(m, passiveIncomeByMonth.length - 1);
                        totalPassiveIncomeThisYear += (passiveIncomeByMonth[monthIdx] || 0) / 12;
                    }
                    const dynamicNetAnnualExpenses = Math.max(0, annualExpenses - totalPassiveIncomeThisYear);
                    runCap -= Math.max(0, dynamicNetAnnualExpenses - annualPublicPension);
                } else {
                    let totalSavingsThisYear = 0;
                    for (let m = (y * 12); m < ((y + 1) * 12); m++) {
                        const monthIdx = Math.min(m, debtByMonth.length - 1);
                        const activeDebtThisMonth = debtByMonth[monthIdx] || 0;
                        const freedUpCashFlow = baseInstallmentNow - activeDebtThisMonth;
                        totalSavingsThisYear += (monthlySavings + Math.max(0, freedUpCashFlow));
                    }
                    runCap += totalSavingsThisYear;
                }

                if (enablePensionOptimizer && !isRetired) {
                    runCap += annualTaxRefund;
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
            currentData.push({
                age: currentAge + y,
                p10: Math.round(sortedCol[Math.floor(runsCompleted * 0.1)]),
                p50: Math.round(sortedCol[Math.floor(runsCompleted * 0.5)]),
                p90: Math.round(sortedCol[Math.floor(runsCompleted * 0.9)]),
                Target: fireTarget
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
