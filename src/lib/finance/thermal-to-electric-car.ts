export const TESLA_MODEL_3_LONG_RANGE_RWD_2026_CONSUMPTION_KWH_PER_100KM = 13.6;

export type CurrentCarSaleMode = "privateSale" | "tradeIn";

export interface ThermalToElectricCarInput {
    horizonYears: number;
    annualKm: number;

    thermalCurrentValue: number;
    thermalTradeInValueNow?: number;
    currentCarSaleMode?: CurrentCarSaleMode;
    thermalPrivateSaleCostsNow?: number;
    thermalFutureValue: number;
    thermalConsumptionLitersPer100Km: number;
    thermalRealWorldAdjustmentPct?: number;
    fuelPricePerLiter: number;
    fuelCostGrowthPct?: number;
    thermalInsurancePerYear: number;
    thermalMaintenancePerYear: number;
    thermalTaxPerYear: number;
    thermalOtherFixedPerYear: number;
    thermalFixedCostGrowthPct?: number;
    thermalOneOffCost: number;

    evPurchasePrice: number;
    evPurchaseFeesOneOff?: number;
    evHomeSetupCost?: number;
    evFutureValue: number;
    evConsumptionKwhPer100Km: number;
    evRealWorldAdjustmentPct?: number;
    chargingLossPct?: number;
    homeChargingSharePct: number;
    homeElectricityPricePerKwh: number;
    publicChargingPricePerKwh: number;
    electricityCostGrowthPct?: number;
    evInsurancePerYear: number;
    evMaintenancePerYear: number;
    evTaxPerYear: number;
    evOtherFixedPerYear: number;
    evFixedCostGrowthPct?: number;
    evOneOffCost: number;
    evIncentives: number;
    evAnnualBenefitsPerYear?: number;

    evFinancingEnabled?: boolean;
    evFinancingDownPayment?: number;
    evFinancingAnnualRatePct?: number;
    evFinancingYears?: number;
    evFinancingFees?: number;
}

export interface ThermalToElectricCarYearPoint {
    year: number;
    label: string;
    thermalCumulativeCost: number;
    evCumulativeCost: number;
    advantage: number;
}

export interface ThermalToElectricCarYearBreakdown {
    year: number;
    label: string;
    fuelPricePerLiter: number;
    homeElectricityPricePerKwh: number;
    publicElectricityPricePerKwh: number;
    thermalFuelCost: number;
    thermalFixedCost: number;
    thermalAnnualCost: number;
    evChargeCost: number;
    evFixedCost: number;
    evBenefits: number;
    evAnnualCost: number;
    evFinancingInterest: number;
    evFinancingPrincipal: number;
    evRemainingDebtEndOfYear: number;
    annualRunningSavings: number;
    thermalCumulativeCost: number;
    evCumulativeCost: number;
    cumulativeSavings: number;
}

export interface ThermalToElectricCarResult {
    horizonYears: number;
    annualKm: number;
    totalKmHorizon: number;
    currentCarSaleMode: CurrentCarSaleMode;
    homeChargingSharePct: number;
    publicChargingSharePct: number;

    thermalRealWorldAdjustmentPct: number;
    evRealWorldAdjustmentPct: number;
    chargingLossPct: number;
    fuelCostGrowthPct: number;
    electricityCostGrowthPct: number;
    thermalFixedCostGrowthPct: number;
    evFixedCostGrowthPct: number;
    evAnnualBenefitsPerYear: number;

    selectedCurrentCarSaleValueNow: number;
    selectedCurrentCarSaleNetProceedsNow: number;
    thermalTradeInValueNow: number;
    thermalPrivateSaleCostsNow: number;
    thermalTradeInDiscountVsPrivateSale: number;

    effectiveThermalConsumptionLitersPer100Km: number;
    effectiveEvConsumptionKwhPer100Km: number;
    evGridConsumptionKwhPer100Km: number;

    thermalFuelCostPer100Km: number;
    thermalFuelCostPerKm: number;
    thermalFuelLitersPerYear: number;
    thermalFuelCostPerYear: number;
    thermalAnnualFixedCost: number;
    thermalAnnualCost: number;
    thermalAverageAnnualCost: number;
    thermalTotalOperatingCost: number;
    thermalDepreciation: number;
    thermalTotalCost: number;

    evPurchaseFeesOneOff: number;
    evHomeSetupCost: number;
    evUpfrontNonRecoverableCost: number;
    evNetAcquisitionCostAfterSale: number;
    evGrossCashNeededToday: number;
    evEconomicSwitchCostToday: number;

    evHomeCostPer100Km: number;
    evPublicCostPer100Km: number;
    evBlendedEnergyPricePerKwh: number;
    evChargeCostPer100Km: number;
    evChargeCostPerKm: number;
    evEnergyKwhPerYear: number;
    evChargeCostPerYear: number;
    evAnnualFixedCost: number;
    evAnnualCost: number;
    evAverageAnnualCost: number;
    evTotalOperatingCost: number;
    evDepreciation: number;
    evTotalCost: number;

    evFinancingEnabled: boolean;
    evFinancingDownPayment: number;
    evFinancingAnnualRatePct: number;
    evFinancingYears: number;
    evFinancingFees: number;
    evFinancingPrincipal: number;
    evFinancingMonthlyPayment: number;
    evFinancingMonths: number;
    evFinancingTotalInterest: number;
    evFinancingInterestWithinHorizon: number;
    evFinancingPaymentsWithinHorizon: number;
    evFinancingPrincipalWithinHorizon: number;
    evFinancingRemainingDebtAtHorizon: number;

    annualRunningSavings: number;
    monthlyRunningSavings: number;
    averageAnnualRunningSavings: number;
    totalOperatingSavings: number;
    totalSavingsOverHorizon: number;
    allInThermalCostPerKm: number;
    allInEvCostPerKm: number;
    cashGapToday: number;
    cashSurplusToday: number;
    effectiveNetOutlayToday: number;
    breakEvenAnnualKm: number | null;
    economicBreakEvenYears: number | null;
    cashPaybackYears: number | null;
    chartData: ThermalToElectricCarYearPoint[];
    yearlyBreakdown: ThermalToElectricCarYearBreakdown[];
}

interface LoanSummary {
    principal: number;
    annualRatePct: number;
    years: number;
    months: number;
    monthlyPayment: number;
    totalInterest: number;
    interestWithinHorizon: number;
    paymentsWithinHorizon: number;
    principalWithinHorizon: number;
    remainingDebtAtHorizon: number;
    yearlyInterest: number[];
    yearlyPrincipal: number[];
    yearlyRemainingDebt: number[];
}

function safeFinite(value: number, fallback: number = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

function safeNonNegative(value: number): number {
    return Math.max(0, safeFinite(value, 0));
}

function safePositiveInteger(value: number, fallback: number = 1): number {
    return Math.max(1, Math.floor(safeFinite(value, fallback)));
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function grow(base: number, growthPct: number, yearIndex: number): number {
    return base * Math.pow(1 + growthPct / 100, yearIndex);
}

function interpolateBreakEven(values: number[]): number | null {
    if (values.length === 0) return null;
    if (values[0] >= 0) return 0;

    for (let index = 1; index < values.length; index++) {
        const previous = values[index - 1];
        const current = values[index];
        if (current >= 0 && current !== previous) {
            const progress = (0 - previous) / (current - previous);
            return index - 1 + progress;
        }
    }

    return null;
}

function buildLoanSummary(params: {
    enabled: boolean;
    principal: number;
    annualRatePct: number;
    years: number;
    horizonYears: number;
}): LoanSummary {
    const horizonYears = safePositiveInteger(params.horizonYears, 1);
    const yearlyInterest = Array.from({ length: horizonYears }, () => 0);
    const yearlyPrincipal = Array.from({ length: horizonYears }, () => 0);
    const yearlyRemainingDebt = Array.from({ length: horizonYears }, () => 0);

    const principal = safeNonNegative(params.principal);
    const annualRatePct = safeNonNegative(params.annualRatePct);
    const years = safePositiveInteger(params.years, 1);

    if (!params.enabled || principal === 0) {
        return {
            principal: 0,
            annualRatePct,
            years,
            months: 0,
            monthlyPayment: 0,
            totalInterest: 0,
            interestWithinHorizon: 0,
            paymentsWithinHorizon: 0,
            principalWithinHorizon: 0,
            remainingDebtAtHorizon: 0,
            yearlyInterest,
            yearlyPrincipal,
            yearlyRemainingDebt,
        };
    }

    const months = years * 12;
    const monthlyRate = annualRatePct / 100 / 12;
    const monthlyPayment =
        monthlyRate === 0
            ? principal / months
            : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
              (Math.pow(1 + monthlyRate, months) - 1);

    let balance = principal;
    let totalInterest = 0;
    let interestWithinHorizon = 0;
    let paymentsWithinHorizon = 0;
    let principalWithinHorizon = 0;

    const monthsWithinHorizon = Math.min(months, horizonYears * 12);

    for (let month = 1; month <= months; month++) {
        const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
        const principalPaid = Math.min(balance, monthlyPayment - interest);
        balance = Math.max(0, balance - principalPaid);
        totalInterest += interest;

        if (month <= monthsWithinHorizon) {
            const yearIndex = Math.floor((month - 1) / 12);
            yearlyInterest[yearIndex] += interest;
            yearlyPrincipal[yearIndex] += principalPaid;
            yearlyRemainingDebt[yearIndex] = balance;
            interestWithinHorizon += interest;
            paymentsWithinHorizon += interest + principalPaid;
            principalWithinHorizon += principalPaid;
        }
    }

    for (let yearIndex = 1; yearIndex < yearlyRemainingDebt.length; yearIndex++) {
        if (yearlyRemainingDebt[yearIndex] === 0 && yearIndex > Math.ceil(monthsWithinHorizon / 12) - 1) {
            yearlyRemainingDebt[yearIndex] = 0;
        } else if (yearlyRemainingDebt[yearIndex] === 0 && yearlyRemainingDebt[yearIndex - 1] > 0) {
            yearlyRemainingDebt[yearIndex] = yearlyRemainingDebt[yearIndex - 1];
        }
    }

    const remainingDebtAtHorizon = monthsWithinHorizon >= months ? 0 : Math.max(0, principal - principalWithinHorizon);

    return {
        principal,
        annualRatePct,
        years,
        months,
        monthlyPayment,
        totalInterest,
        interestWithinHorizon,
        paymentsWithinHorizon,
        principalWithinHorizon,
        remainingDebtAtHorizon,
        yearlyInterest,
        yearlyPrincipal,
        yearlyRemainingDebt,
    };
}

export function compareThermalToElectricCar(input: ThermalToElectricCarInput): ThermalToElectricCarResult {
    const horizonYears = safePositiveInteger(input.horizonYears, 5);
    const annualKm = safeNonNegative(input.annualKm);
    const totalKmHorizon = annualKm * horizonYears;

    const thermalCurrentValue = safeNonNegative(input.thermalCurrentValue);
    const thermalTradeInValueNow = clamp(safeNonNegative(input.thermalTradeInValueNow ?? thermalCurrentValue), 0, thermalCurrentValue);
    const currentCarSaleMode: CurrentCarSaleMode = input.currentCarSaleMode ?? "privateSale";
    const thermalPrivateSaleCostsNow = safeNonNegative(input.thermalPrivateSaleCostsNow ?? 0);
    const thermalFutureValue = clamp(safeNonNegative(input.thermalFutureValue), 0, thermalCurrentValue);
    const thermalConsumptionLitersPer100Km = safeNonNegative(input.thermalConsumptionLitersPer100Km);
    const thermalRealWorldAdjustmentPct = safeFinite(input.thermalRealWorldAdjustmentPct ?? 0, 0);
    const fuelPricePerLiter = safeNonNegative(input.fuelPricePerLiter);
    const fuelCostGrowthPct = safeFinite(input.fuelCostGrowthPct ?? 0, 0);
    const thermalInsurancePerYear = safeNonNegative(input.thermalInsurancePerYear);
    const thermalMaintenancePerYear = safeNonNegative(input.thermalMaintenancePerYear);
    const thermalTaxPerYear = safeNonNegative(input.thermalTaxPerYear);
    const thermalOtherFixedPerYear = safeNonNegative(input.thermalOtherFixedPerYear);
    const thermalFixedCostGrowthPct = safeFinite(input.thermalFixedCostGrowthPct ?? 0, 0);
    const thermalOneOffCost = safeNonNegative(input.thermalOneOffCost);

    const evPurchasePrice = safeNonNegative(input.evPurchasePrice);
    const evPurchaseFeesOneOff = safeNonNegative(input.evPurchaseFeesOneOff ?? 0);
    const evHomeSetupCost = safeNonNegative(input.evHomeSetupCost ?? 0);
    const evFutureValue = clamp(safeNonNegative(input.evFutureValue), 0, evPurchasePrice);
    const evConsumptionKwhPer100Km = safeNonNegative(input.evConsumptionKwhPer100Km);
    const evRealWorldAdjustmentPct = safeFinite(input.evRealWorldAdjustmentPct ?? 0, 0);
    const chargingLossPct = clamp(safeFinite(input.chargingLossPct ?? 0, 0), 0, 100);
    const homeChargingSharePct = clamp(safeNonNegative(input.homeChargingSharePct), 0, 100);
    const publicChargingSharePct = 100 - homeChargingSharePct;
    const homeElectricityPricePerKwh = safeNonNegative(input.homeElectricityPricePerKwh);
    const publicChargingPricePerKwh = safeNonNegative(input.publicChargingPricePerKwh);
    const electricityCostGrowthPct = safeFinite(input.electricityCostGrowthPct ?? 0, 0);
    const evInsurancePerYear = safeNonNegative(input.evInsurancePerYear);
    const evMaintenancePerYear = safeNonNegative(input.evMaintenancePerYear);
    const evTaxPerYear = safeNonNegative(input.evTaxPerYear);
    const evOtherFixedPerYear = safeNonNegative(input.evOtherFixedPerYear);
    const evFixedCostGrowthPct = safeFinite(input.evFixedCostGrowthPct ?? 0, 0);
    const evOneOffCost = safeNonNegative(input.evOneOffCost);
    const evIncentives = safeNonNegative(input.evIncentives);
    const evAnnualBenefitsPerYear = safeNonNegative(input.evAnnualBenefitsPerYear ?? 0);

    const evFinancingEnabled = Boolean(input.evFinancingEnabled);
    const evFinancingDownPayment = safeNonNegative(input.evFinancingDownPayment ?? 0);
    const evFinancingAnnualRatePct = safeNonNegative(input.evFinancingAnnualRatePct ?? 0);
    const evFinancingYears = safePositiveInteger(input.evFinancingYears ?? 5, 5);
    const evFinancingFees = safeNonNegative(input.evFinancingFees ?? 0);

    const selectedCurrentCarSaleValueNow =
        currentCarSaleMode === "tradeIn" ? thermalTradeInValueNow : thermalCurrentValue;
    const selectedCurrentCarSaleNetProceedsNow =
        currentCarSaleMode === "tradeIn"
            ? thermalTradeInValueNow
            : Math.max(0, thermalCurrentValue - thermalPrivateSaleCostsNow);
    const thermalTradeInDiscountVsPrivateSale = Math.max(0, thermalCurrentValue - thermalTradeInValueNow);

    const effectiveThermalConsumptionLitersPer100Km =
        thermalConsumptionLitersPer100Km * (1 + thermalRealWorldAdjustmentPct / 100);
    const effectiveEvConsumptionKwhPer100Km =
        evConsumptionKwhPer100Km * (1 + evRealWorldAdjustmentPct / 100);
    const evGridConsumptionKwhPer100Km =
        effectiveEvConsumptionKwhPer100Km * (1 + chargingLossPct / 100);

    const thermalAnnualFixedBase =
        thermalInsurancePerYear +
        thermalMaintenancePerYear +
        thermalTaxPerYear +
        thermalOtherFixedPerYear;
    const evAnnualFixedBase =
        evInsurancePerYear +
        evMaintenancePerYear +
        evTaxPerYear +
        evOtherFixedPerYear;

    const thermalDepreciation = thermalCurrentValue - thermalFutureValue;
    const evDepreciation = evPurchasePrice - evFutureValue;
    const annualThermalDepreciation = thermalDepreciation / horizonYears;
    const annualEvDepreciation = evDepreciation / horizonYears;

    const evUpfrontNonRecoverableCost =
        evPurchaseFeesOneOff +
        evHomeSetupCost +
        evOneOffCost +
        evFinancingFees;

    const evEconomicSwitchCostToday =
        evPurchasePrice +
        evPurchaseFeesOneOff +
        evHomeSetupCost +
        evOneOffCost -
        evIncentives -
        selectedCurrentCarSaleNetProceedsNow;

    const rawFinancingPrincipal =
        evPurchasePrice +
        evPurchaseFeesOneOff +
        evHomeSetupCost +
        evOneOffCost -
        evIncentives -
        selectedCurrentCarSaleNetProceedsNow -
        evFinancingDownPayment;
    const evFinancingPrincipal = evFinancingEnabled ? Math.max(0, rawFinancingPrincipal) : 0;
    const loanSummary = buildLoanSummary({
        enabled: evFinancingEnabled,
        principal: evFinancingPrincipal,
        annualRatePct: evFinancingAnnualRatePct,
        years: evFinancingYears,
        horizonYears,
    });

    const evGrossCashNeededToday = evFinancingEnabled
        ? evFinancingDownPayment + evFinancingFees
        : evEconomicSwitchCostToday;
    const effectiveNetOutlayToday = evGrossCashNeededToday;
    const cashGapToday = Math.max(0, effectiveNetOutlayToday);
    const cashSurplusToday = Math.max(0, -effectiveNetOutlayToday);

    let thermalTotalOperatingCost = 0;
    let evTotalOperatingCost = 0;
    let thermalFixedTotalHorizon = 0;
    let evFixedTotalHorizon = 0;
    let thermalVariableCostCoefficient = 0;
    let evVariableCostCoefficient = 0;

    let cumulativeThermalCost = thermalOneOffCost;
    let cumulativeEvCost = evUpfrontNonRecoverableCost - evIncentives;
    let cumulativeRunningSavings = 0;

    const chartData: ThermalToElectricCarYearPoint[] = [
        {
            year: 0,
            label: "Oggi",
            thermalCumulativeCost: cumulativeThermalCost,
            evCumulativeCost: cumulativeEvCost,
            advantage: cumulativeThermalCost - cumulativeEvCost,
        },
    ];

    const yearlyBreakdown: ThermalToElectricCarYearBreakdown[] = [];
    const economicSeries = [cumulativeThermalCost - cumulativeEvCost];
    const cashSeries = [-cashGapToday];
    const runningSavingsSeries = [0];

    for (let year = 1; year <= horizonYears; year++) {
        const yearIndex = year - 1;
        const fuelPriceThisYear = grow(fuelPricePerLiter, fuelCostGrowthPct, yearIndex);
        const homeElectricityPriceThisYear = grow(homeElectricityPricePerKwh, electricityCostGrowthPct, yearIndex);
        const publicElectricityPriceThisYear = grow(publicChargingPricePerKwh, electricityCostGrowthPct, yearIndex);
        const thermalFixedCostThisYear = grow(thermalAnnualFixedBase, thermalFixedCostGrowthPct, yearIndex);
        const evFixedCostThisYear = grow(evAnnualFixedBase, evFixedCostGrowthPct, yearIndex);

        const thermalFuelCostPer100KmThisYear = effectiveThermalConsumptionLitersPer100Km * fuelPriceThisYear;
        const blendedElectricityPriceThisYear =
            (homeChargingSharePct / 100) * homeElectricityPriceThisYear +
            (publicChargingSharePct / 100) * publicElectricityPriceThisYear;
        const evChargeCostPer100KmThisYear = evGridConsumptionKwhPer100Km * blendedElectricityPriceThisYear;

        const thermalFuelCostThisYear = annualKm * (thermalFuelCostPer100KmThisYear / 100);
        const evChargeCostThisYear = annualKm * (evChargeCostPer100KmThisYear / 100);
        const thermalAnnualCostThisYear = thermalFuelCostThisYear + thermalFixedCostThisYear;
        const evAnnualCostThisYear =
            evChargeCostThisYear +
            evFixedCostThisYear -
            evAnnualBenefitsPerYear +
            loanSummary.yearlyInterest[yearIndex];

        const annualRunningSavingsThisYear = thermalAnnualCostThisYear - evAnnualCostThisYear;

        thermalTotalOperatingCost += thermalAnnualCostThisYear;
        evTotalOperatingCost += evAnnualCostThisYear;
        thermalFixedTotalHorizon += thermalFixedCostThisYear;
        evFixedTotalHorizon += evFixedCostThisYear - evAnnualBenefitsPerYear + loanSummary.yearlyInterest[yearIndex];
        thermalVariableCostCoefficient += thermalFuelCostPer100KmThisYear / 100;
        evVariableCostCoefficient += evChargeCostPer100KmThisYear / 100;

        cumulativeThermalCost += thermalAnnualCostThisYear + annualThermalDepreciation;
        cumulativeEvCost += evAnnualCostThisYear + annualEvDepreciation;
        cumulativeRunningSavings += annualRunningSavingsThisYear;

        const cumulativeSavings = cumulativeThermalCost - cumulativeEvCost;

        yearlyBreakdown.push({
            year,
            label: `Anno ${year}`,
            fuelPricePerLiter: fuelPriceThisYear,
            homeElectricityPricePerKwh: homeElectricityPriceThisYear,
            publicElectricityPricePerKwh: publicElectricityPriceThisYear,
            thermalFuelCost: thermalFuelCostThisYear,
            thermalFixedCost: thermalFixedCostThisYear,
            thermalAnnualCost: thermalAnnualCostThisYear,
            evChargeCost: evChargeCostThisYear,
            evFixedCost: evFixedCostThisYear,
            evBenefits: evAnnualBenefitsPerYear,
            evAnnualCost: evAnnualCostThisYear,
            evFinancingInterest: loanSummary.yearlyInterest[yearIndex],
            evFinancingPrincipal: loanSummary.yearlyPrincipal[yearIndex],
            evRemainingDebtEndOfYear: loanSummary.yearlyRemainingDebt[yearIndex],
            annualRunningSavings: annualRunningSavingsThisYear,
            thermalCumulativeCost: cumulativeThermalCost,
            evCumulativeCost: cumulativeEvCost,
            cumulativeSavings,
        });

        chartData.push({
            year,
            label: `Anno ${year}`,
            thermalCumulativeCost: cumulativeThermalCost,
            evCumulativeCost: cumulativeEvCost,
            advantage: cumulativeSavings,
        });

        economicSeries.push(cumulativeSavings);
        runningSavingsSeries.push(cumulativeRunningSavings);
        cashSeries.push(cumulativeRunningSavings - cashGapToday);
    }

    const thermalTotalCost = cumulativeThermalCost;
    const evTotalCost = cumulativeEvCost;
    const totalSavingsOverHorizon = thermalTotalCost - evTotalCost;

    const thermalFuelCostPer100Km = effectiveThermalConsumptionLitersPer100Km * fuelPricePerLiter;
    const thermalFuelCostPerKm = thermalFuelCostPer100Km / 100;
    const thermalFuelLitersPerYear = (annualKm * effectiveThermalConsumptionLitersPer100Km) / 100;
    const thermalFuelCostPerYear = annualKm * thermalFuelCostPerKm;
    const thermalAnnualFixedCost = thermalAnnualFixedBase;
    const thermalAnnualCost = thermalFuelCostPerYear + thermalAnnualFixedCost;
    const thermalAverageAnnualCost = thermalTotalOperatingCost / horizonYears;

    const evHomeCostPer100Km = evGridConsumptionKwhPer100Km * homeElectricityPricePerKwh;
    const evPublicCostPer100Km = evGridConsumptionKwhPer100Km * publicChargingPricePerKwh;
    const evBlendedEnergyPricePerKwh =
        (homeChargingSharePct / 100) * homeElectricityPricePerKwh +
        (publicChargingSharePct / 100) * publicChargingPricePerKwh;
    const evChargeCostPer100Km = evGridConsumptionKwhPer100Km * evBlendedEnergyPricePerKwh;
    const evChargeCostPerKm = evChargeCostPer100Km / 100;
    const evEnergyKwhPerYear = (annualKm * evGridConsumptionKwhPer100Km) / 100;
    const evChargeCostPerYear = annualKm * evChargeCostPerKm;
    const evAnnualFixedCost = evAnnualFixedBase;
    const evAnnualCost = evChargeCostPerYear + evAnnualFixedCost - evAnnualBenefitsPerYear + loanSummary.yearlyInterest[0];
    const evAverageAnnualCost = evTotalOperatingCost / horizonYears;

    const annualRunningSavings = thermalAnnualCost - evAnnualCost;
    const monthlyRunningSavings = annualRunningSavings / 12;
    const averageAnnualRunningSavings = (thermalTotalOperatingCost - evTotalOperatingCost) / horizonYears;
    const totalOperatingSavings = thermalTotalOperatingCost - evTotalOperatingCost;

    const allInThermalCostPerKm = totalKmHorizon > 0 ? thermalTotalCost / totalKmHorizon : 0;
    const allInEvCostPerKm = totalKmHorizon > 0 ? evTotalCost / totalKmHorizon : 0;

    const fixedAdvantageOverHorizon =
        thermalOneOffCost +
        thermalFixedTotalHorizon +
        thermalDepreciation -
        (evUpfrontNonRecoverableCost - evIncentives + evFixedTotalHorizon + evDepreciation);
    const variableAdvantagePerAnnualKm =
        thermalVariableCostCoefficient - evVariableCostCoefficient;

    let breakEvenAnnualKm: number | null = null;
    if (fixedAdvantageOverHorizon >= 0) {
        breakEvenAnnualKm = 0;
    } else if (variableAdvantagePerAnnualKm > 0) {
        breakEvenAnnualKm = -fixedAdvantageOverHorizon / variableAdvantagePerAnnualKm;
    }

    const economicBreakEvenYears = interpolateBreakEven(economicSeries);
    const cashPaybackYears = interpolateBreakEven(cashSeries);

    return {
        horizonYears,
        annualKm,
        totalKmHorizon,
        currentCarSaleMode,
        homeChargingSharePct,
        publicChargingSharePct,

        thermalRealWorldAdjustmentPct,
        evRealWorldAdjustmentPct,
        chargingLossPct,
        fuelCostGrowthPct,
        electricityCostGrowthPct,
        thermalFixedCostGrowthPct,
        evFixedCostGrowthPct,
        evAnnualBenefitsPerYear,

        selectedCurrentCarSaleValueNow,
        selectedCurrentCarSaleNetProceedsNow,
        thermalTradeInValueNow,
        thermalPrivateSaleCostsNow,
        thermalTradeInDiscountVsPrivateSale,

        effectiveThermalConsumptionLitersPer100Km,
        effectiveEvConsumptionKwhPer100Km,
        evGridConsumptionKwhPer100Km,

        thermalFuelCostPer100Km,
        thermalFuelCostPerKm,
        thermalFuelLitersPerYear,
        thermalFuelCostPerYear,
        thermalAnnualFixedCost,
        thermalAnnualCost,
        thermalAverageAnnualCost,
        thermalTotalOperatingCost,
        thermalDepreciation,
        thermalTotalCost,

        evPurchaseFeesOneOff,
        evHomeSetupCost,
        evUpfrontNonRecoverableCost,
        evNetAcquisitionCostAfterSale: evEconomicSwitchCostToday,
        evGrossCashNeededToday,
        evEconomicSwitchCostToday,

        evHomeCostPer100Km,
        evPublicCostPer100Km,
        evBlendedEnergyPricePerKwh,
        evChargeCostPer100Km,
        evChargeCostPerKm,
        evEnergyKwhPerYear,
        evChargeCostPerYear,
        evAnnualFixedCost,
        evAnnualCost,
        evAverageAnnualCost,
        evTotalOperatingCost,
        evDepreciation,
        evTotalCost,

        evFinancingEnabled,
        evFinancingDownPayment,
        evFinancingAnnualRatePct,
        evFinancingYears,
        evFinancingFees,
        evFinancingPrincipal,
        evFinancingMonthlyPayment: loanSummary.monthlyPayment,
        evFinancingMonths: loanSummary.months,
        evFinancingTotalInterest: loanSummary.totalInterest,
        evFinancingInterestWithinHorizon: loanSummary.interestWithinHorizon,
        evFinancingPaymentsWithinHorizon: loanSummary.paymentsWithinHorizon,
        evFinancingPrincipalWithinHorizon: loanSummary.principalWithinHorizon,
        evFinancingRemainingDebtAtHorizon: loanSummary.remainingDebtAtHorizon,

        annualRunningSavings,
        monthlyRunningSavings,
        averageAnnualRunningSavings,
        totalOperatingSavings,
        totalSavingsOverHorizon,
        allInThermalCostPerKm,
        allInEvCostPerKm,
        cashGapToday,
        cashSurplusToday,
        effectiveNetOutlayToday,
        breakEvenAnnualKm,
        economicBreakEvenYears,
        cashPaybackYears,
        chartData,
        yearlyBreakdown,
    };
}
