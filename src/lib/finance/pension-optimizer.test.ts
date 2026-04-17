import { describe, expect, it } from "vitest";
import { calculateIrpef } from "@/lib/finance/irpef";
import { MAX_PENSION_DEDUCTIBLE, TFR_RATE } from "@/lib/pension-config";
import type { PensionConfig } from "@/types";
import { computeContributionAmount, computePensionBreakdown } from "./pension-optimizer";

describe("pension optimizer", () => {
    it("calcola contributi percentuali, fissi, TFR e rimborso per persona", () => {
        const config: PensionConfig = {
            person1: {
                active: true,
                grossAnnualSalary: 40_000,
                voluntaryContribution: { mode: "percent", value: 5 },
                employerContribution: { mode: "fixed", value: 1_000 },
            },
            person2: {
                active: true,
                grossAnnualSalary: 30_000,
                voluntaryContribution: { mode: "fixed", value: 1_200 },
                employerContribution: { mode: "percent", value: 1.5 },
            },
        };

        const result = computePensionBreakdown(config);

        expect(result.byPerson.person1.voluntaryAmount).toBeCloseTo(2_000, 6);
        expect(result.byPerson.person1.employerAmount).toBeCloseTo(1_000, 6);
        expect(result.byPerson.person1.tfrAmount).toBeCloseTo(40_000 * TFR_RATE, 6);
        expect(result.byPerson.person1.annualTaxRefund).toBeCloseTo(
            calculateIrpef(40_000) - calculateIrpef(40_000, 2_000),
            6,
        );

        expect(result.byPerson.person2.voluntaryAmount).toBeCloseTo(1_200, 6);
        expect(result.byPerson.person2.employerAmount).toBeCloseTo(450, 6);
        expect(result.byPerson.person2.tfrAmount).toBeCloseTo(30_000 * TFR_RATE, 6);

        expect(result.totalVoluntary).toBeCloseTo(3_200, 6);
        expect(result.totalEmployer).toBeCloseTo(1_450, 6);
        expect(result.totalTfr).toBeCloseTo(70_000 * TFR_RATE, 6);
        expect(result.totalAnnualContribution).toBeCloseTo(result.totalVoluntary + result.totalEmployer + result.totalTfr, 6);
    });

    it("applica il cap fiscale per persona senza tagliare il versamento effettivo", () => {
        const config: PensionConfig = {
            person1: {
                active: true,
                grossAnnualSalary: 100_000,
                voluntaryContribution: { mode: "fixed", value: 10_000 },
                employerContribution: { mode: "fixed", value: 0 },
            },
            person2: {
                active: false,
                grossAnnualSalary: 80_000,
                voluntaryContribution: { mode: "fixed", value: 10_000 },
                employerContribution: { mode: "fixed", value: 10_000 },
            },
        };

        const result = computePensionBreakdown(config);

        expect(result.byPerson.person1.voluntaryAmount).toBe(10_000);
        expect(result.byPerson.person1.deductibleVoluntaryAmount).toBe(MAX_PENSION_DEDUCTIBLE);
        expect(result.byPerson.person1.annualTaxRefund).toBeCloseTo(
            calculateIrpef(100_000) - calculateIrpef(100_000, MAX_PENSION_DEDUCTIBLE),
            6,
        );
        expect(result.byPerson.person2.totalAnnualContribution).toBe(0);
    });

    it("non genera valori negativi da percentuali o importi invalidi", () => {
        expect(computeContributionAmount({ mode: "percent", value: -5 }, 40_000)).toBe(0);
        expect(computeContributionAmount({ mode: "fixed", value: -500 }, 40_000)).toBe(0);
        expect(computeContributionAmount({ mode: "percent", value: 5 }, -40_000)).toBe(0);
    });
});
