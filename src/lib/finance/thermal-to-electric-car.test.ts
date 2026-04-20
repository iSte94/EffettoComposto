import { describe, expect, it } from "vitest";
import {
    compareThermalToElectricCar,
    TESLA_MODEL_3_LONG_RANGE_RWD_2026_CONSUMPTION_KWH_PER_100KM,
} from "./thermal-to-electric-car";

describe("compareThermalToElectricCar", () => {
    it("usa il preset Tesla ufficiale da 13,6 kWh/100 km come base del comparatore", () => {
        expect(TESLA_MODEL_3_LONG_RANGE_RWD_2026_CONSUMPTION_KWH_PER_100KM).toBe(13.6);
    });

    it("calcola correttamente i costi annuali di carburante e ricarica nel primo anno", () => {
        const result = compareThermalToElectricCar({
            horizonYears: 5,
            annualKm: 10000,
            thermalCurrentValue: 12000,
            thermalFutureValue: 6000,
            thermalConsumptionLitersPer100Km: 6,
            fuelPricePerLiter: 2,
            thermalInsurancePerYear: 0,
            thermalMaintenancePerYear: 0,
            thermalTaxPerYear: 0,
            thermalOtherFixedPerYear: 0,
            thermalOneOffCost: 0,
            evPurchasePrice: 40000,
            evFutureValue: 22000,
            evConsumptionKwhPer100Km: 15,
            homeChargingSharePct: 100,
            homeElectricityPricePerKwh: 0.2,
            publicChargingPricePerKwh: 0.7,
            evInsurancePerYear: 0,
            evMaintenancePerYear: 0,
            evTaxPerYear: 0,
            evOtherFixedPerYear: 0,
            evOneOffCost: 0,
            evIncentives: 0,
        });

        expect(result.thermalFuelLitersPerYear).toBe(600);
        expect(result.thermalFuelCostPerYear).toBeCloseTo(1200, 6);
        expect(result.evEnergyKwhPerYear).toBe(1500);
        expect(result.evChargeCostPerYear).toBeCloseTo(300, 6);
        expect(result.annualRunningSavings).toBeCloseTo(900, 6);
    });

    it("applica scostamento reale e perdite di ricarica ai consumi EV", () => {
        const result = compareThermalToElectricCar({
            horizonYears: 5,
            annualKm: 10000,
            thermalCurrentValue: 10000,
            thermalFutureValue: 5000,
            thermalConsumptionLitersPer100Km: 6,
            fuelPricePerLiter: 2,
            thermalInsurancePerYear: 0,
            thermalMaintenancePerYear: 0,
            thermalTaxPerYear: 0,
            thermalOtherFixedPerYear: 0,
            thermalOneOffCost: 0,
            evPurchasePrice: 30000,
            evFutureValue: 18000,
            evConsumptionKwhPer100Km: 15,
            evRealWorldAdjustmentPct: 10,
            chargingLossPct: 10,
            homeChargingSharePct: 100,
            homeElectricityPricePerKwh: 0.2,
            publicChargingPricePerKwh: 0.7,
            evInsurancePerYear: 0,
            evMaintenancePerYear: 0,
            evTaxPerYear: 0,
            evOtherFixedPerYear: 0,
            evOneOffCost: 0,
            evIncentives: 0,
        });

        expect(result.effectiveEvConsumptionKwhPer100Km).toBeCloseTo(16.5, 6);
        expect(result.evGridConsumptionKwhPer100Km).toBeCloseTo(18.15, 6);
        expect(result.evEnergyKwhPerYear).toBeCloseTo(1815, 6);
        expect(result.evChargeCostPerYear).toBeCloseTo(363, 6);
    });

    it("distingue vendita privata e permuta dell'auto attuale", () => {
        const privateSale = compareThermalToElectricCar({
            horizonYears: 5,
            annualKm: 10000,
            thermalCurrentValue: 12000,
            thermalTradeInValueNow: 9500,
            currentCarSaleMode: "privateSale",
            thermalPrivateSaleCostsNow: 300,
            thermalFutureValue: 5000,
            thermalConsumptionLitersPer100Km: 6,
            fuelPricePerLiter: 2,
            thermalInsurancePerYear: 0,
            thermalMaintenancePerYear: 0,
            thermalTaxPerYear: 0,
            thermalOtherFixedPerYear: 0,
            thermalOneOffCost: 0,
            evPurchasePrice: 35000,
            evFutureValue: 20000,
            evConsumptionKwhPer100Km: 15,
            homeChargingSharePct: 100,
            homeElectricityPricePerKwh: 0.2,
            publicChargingPricePerKwh: 0.7,
            evInsurancePerYear: 0,
            evMaintenancePerYear: 0,
            evTaxPerYear: 0,
            evOtherFixedPerYear: 0,
            evOneOffCost: 0,
            evIncentives: 0,
        });

        const tradeIn = compareThermalToElectricCar({
            horizonYears: 5,
            annualKm: 10000,
            thermalCurrentValue: 12000,
            thermalTradeInValueNow: 9500,
            currentCarSaleMode: "tradeIn",
            thermalPrivateSaleCostsNow: 300,
            thermalFutureValue: 5000,
            thermalConsumptionLitersPer100Km: 6,
            fuelPricePerLiter: 2,
            thermalInsurancePerYear: 0,
            thermalMaintenancePerYear: 0,
            thermalTaxPerYear: 0,
            thermalOtherFixedPerYear: 0,
            thermalOneOffCost: 0,
            evPurchasePrice: 35000,
            evFutureValue: 20000,
            evConsumptionKwhPer100Km: 15,
            homeChargingSharePct: 100,
            homeElectricityPricePerKwh: 0.2,
            publicChargingPricePerKwh: 0.7,
            evInsurancePerYear: 0,
            evMaintenancePerYear: 0,
            evTaxPerYear: 0,
            evOtherFixedPerYear: 0,
            evOneOffCost: 0,
            evIncentives: 0,
        });

        expect(privateSale.selectedCurrentCarSaleNetProceedsNow).toBe(11700);
        expect(tradeIn.selectedCurrentCarSaleNetProceedsNow).toBe(9500);
        expect(privateSale.thermalTradeInDiscountVsPrivateSale).toBe(2500);
        expect(privateSale.cashGapToday).toBeLessThan(tradeIn.cashGapToday);
    });

    it("include acquisto, pratiche e svalutazione nel confronto totale", () => {
        const result = compareThermalToElectricCar({
            horizonYears: 5,
            annualKm: 0,
            thermalCurrentValue: 10000,
            thermalFutureValue: 3000,
            thermalConsumptionLitersPer100Km: 0,
            fuelPricePerLiter: 0,
            thermalInsurancePerYear: 0,
            thermalMaintenancePerYear: 0,
            thermalTaxPerYear: 0,
            thermalOtherFixedPerYear: 0,
            thermalOneOffCost: 1500,
            evPurchasePrice: 42000,
            evPurchaseFeesOneOff: 900,
            evHomeSetupCost: 1300,
            evFutureValue: 24000,
            evConsumptionKwhPer100Km: 0,
            homeChargingSharePct: 80,
            homeElectricityPricePerKwh: 0.25,
            publicChargingPricePerKwh: 0.7,
            evInsurancePerYear: 0,
            evMaintenancePerYear: 0,
            evTaxPerYear: 0,
            evOtherFixedPerYear: 0,
            evOneOffCost: 800,
            evIncentives: 3000,
            evAnnualBenefitsPerYear: 100,
        });

        expect(result.evUpfrontNonRecoverableCost).toBe(3000);
        expect(result.thermalDepreciation).toBe(7000);
        expect(result.evDepreciation).toBe(18000);
        expect(result.evTotalOperatingCost).toBe(-500);
        expect(result.thermalTotalCost).toBe(8500);
        expect(result.evTotalCost).toBe(17500);
        expect(result.totalSavingsOverHorizon).toBe(-9000);
    });

    it("calcola anticipo, rata, interessi e debito residuo del finanziamento", () => {
        const result = compareThermalToElectricCar({
            horizonYears: 4,
            annualKm: 12000,
            thermalCurrentValue: 14000,
            thermalTradeInValueNow: 13000,
            currentCarSaleMode: "tradeIn",
            thermalFutureValue: 5000,
            thermalConsumptionLitersPer100Km: 6.5,
            fuelPricePerLiter: 1.9,
            thermalInsurancePerYear: 800,
            thermalMaintenancePerYear: 700,
            thermalTaxPerYear: 250,
            thermalOtherFixedPerYear: 0,
            thermalOneOffCost: 500,
            evPurchasePrice: 43000,
            evPurchaseFeesOneOff: 1000,
            evHomeSetupCost: 1200,
            evFutureValue: 26000,
            evConsumptionKwhPer100Km: 13.6,
            homeChargingSharePct: 70,
            homeElectricityPricePerKwh: 0.24,
            publicChargingPricePerKwh: 0.65,
            evInsurancePerYear: 900,
            evMaintenancePerYear: 350,
            evTaxPerYear: 0,
            evOtherFixedPerYear: 0,
            evOneOffCost: 500,
            evIncentives: 3000,
            evFinancingEnabled: true,
            evFinancingDownPayment: 5000,
            evFinancingAnnualRatePct: 6,
            evFinancingYears: 5,
            evFinancingFees: 400,
        });

        expect(result.evFinancingEnabled).toBe(true);
        expect(result.evFinancingPrincipal).toBe(24700);
        expect(result.evFinancingMonthlyPayment).toBeGreaterThan(450);
        expect(result.evFinancingTotalInterest).toBeGreaterThan(3500);
        expect(result.evFinancingInterestWithinHorizon).toBeGreaterThan(2500);
        expect(result.evFinancingRemainingDebtAtHorizon).toBeGreaterThan(0);
        expect(result.cashGapToday).toBe(5400);
    });
});
