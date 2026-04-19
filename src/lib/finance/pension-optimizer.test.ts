import { describe, expect, it } from "vitest";
import { calculateIrpef } from "@/lib/finance/irpef";
import { MAX_PENSION_DEDUCTIBLE, TFR_RATE } from "@/lib/pension-config";
import type { PensionConfig } from "@/types";
import { computeContributionAmount, computePensionBreakdown } from "./pension-optimizer";

// Aliquota INPS standard usata anche nell'optimizer per ricavare la base IRPEF.
const DEFAULT_INPS_RATE = 0.0919;

/** Calcola il rimborso IRPEF corretto: base imponibile = RAL − INPS standard. */
function expectedTaxRefund(ral: number, deductible: number): number {
    const imponibile = Math.max(0, ral * (1 - DEFAULT_INPS_RATE));
    return Math.max(0, calculateIrpef(imponibile) - calculateIrpef(imponibile, deductible));
}

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
        // RAL 40k: imponibile ≈ 36.324€ (33% bracket); 2.000€ di contributo tutto al 33%.
        expect(result.byPerson.person1.annualTaxRefund).toBeCloseTo(
            expectedTaxRefund(40_000, 2_000),
            6,
        );

        expect(result.byPerson.person2.voluntaryAmount).toBeCloseTo(1_200, 6);
        expect(result.byPerson.person2.employerAmount).toBeCloseTo(450, 6);
        expect(result.byPerson.person2.tfrAmount).toBeCloseTo(30_000 * TFR_RATE, 6);
        // RAL 30k: imponibile ≈ 27.243€ (23% bracket); 1.200€ tutto al 23%.
        expect(result.byPerson.person2.annualTaxRefund).toBeCloseTo(
            expectedTaxRefund(30_000, 1_200),
            6,
        );

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
            expectedTaxRefund(100_000, MAX_PENSION_DEDUCTIBLE),
            6,
        );
        expect(result.byPerson.person2.totalAnnualContribution).toBe(0);
    });

    it("non genera valori negativi da percentuali o importi invalidi", () => {
        expect(computeContributionAmount({ mode: "percent", value: -5 }, 40_000)).toBe(0);
        expect(computeContributionAmount({ mode: "fixed", value: -500 }, 40_000)).toBe(0);
        expect(computeContributionAmount({ mode: "percent", value: 5 }, -40_000)).toBe(0);
    });

    // REGRESSIONE: RAL ≈ 28.500€ — il RAL grezzo supera la soglia dello scaglione 23%→33%
    // (28.000€), ma l'imponibile IRPEF reale (RAL − INPS ≈ 25.881€) è nel 23%.
    // Il codice precedente usava il RAL diretto e calcolava il risparmio fiscale
    // applicando la aliquota del 33% anziché del 23%, gonfiando il rimborso del ~43%
    // (es. 280€ invece dei corretti 230€ per 1.000€ di contributo).
    it("REGRESSIONE: rimborso calcolato al 23% per RAL 28.500€ (scaglione reale 23%, non 33%)", () => {
        const ral = 28_500;
        const pensionContribution = 1_000;
        const config: PensionConfig = {
            person1: {
                active: true,
                grossAnnualSalary: ral,
                voluntaryContribution: { mode: "fixed", value: pensionContribution },
                employerContribution: { mode: "fixed", value: 0 },
            },
            person2: {
                active: false,
                grossAnnualSalary: 0,
                voluntaryContribution: { mode: "fixed", value: 0 },
                employerContribution: { mode: "fixed", value: 0 },
            },
        };

        const result = computePensionBreakdown(config);

        // imponibile ≈ 28.500 * 0.9081 = 25.880€ → tutto nel 23%
        // Rimborso atteso = 1.000 * 23% = 230€
        // Rimborso sbagliato (pre-fix) = 280€ (straddle 23/33%)
        const correct = expectedTaxRefund(ral, pensionContribution);
        expect(result.byPerson.person1.annualTaxRefund).toBeCloseTo(correct, 1);
        expect(result.byPerson.person1.annualTaxRefund).toBeCloseTo(230, 0);

        // Verifica che il rimborso sia calcolato al 23% puro (non 33%)
        const refundRate = result.byPerson.person1.annualTaxRefund / pensionContribution;
        expect(refundRate).toBeCloseTo(0.23, 2);
    });

    it("REGRESSIONE: rimborso corretto anche a RAL 30.000€ (scaglione reale 23%)", () => {
        const ral = 30_000;
        const pensionContribution = 1_200;
        const config: PensionConfig = {
            person1: {
                active: true,
                grossAnnualSalary: ral,
                voluntaryContribution: { mode: "fixed", value: pensionContribution },
                employerContribution: { mode: "fixed", value: 0 },
            },
            person2: {
                active: false,
                grossAnnualSalary: 0,
                voluntaryContribution: { mode: "fixed", value: 0 },
                employerContribution: { mode: "fixed", value: 0 },
            },
        };

        const result = computePensionBreakdown(config);

        // imponibile ≈ 30.000 * 0.9081 = 27.243€ → tutto nel 23%
        // Rimborso atteso = 1.200 * 23% = 276€
        // Rimborso sbagliato (pre-fix) ≈ 396€ (straddle 23/33%)
        const correct = expectedTaxRefund(ral, pensionContribution);
        expect(result.byPerson.person1.annualTaxRefund).toBeCloseTo(correct, 1);
        expect(result.byPerson.person1.annualTaxRefund).toBeCloseTo(276, 0);

        const refundRate = result.byPerson.person1.annualTaxRefund / pensionContribution;
        expect(refundRate).toBeCloseTo(0.23, 2);
    });
});
