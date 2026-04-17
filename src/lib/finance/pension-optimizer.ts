import { calculateIrpef } from "@/lib/finance/irpef";
import { MAX_PENSION_DEDUCTIBLE, TFR_RATE } from "@/lib/pension-config";
import type { AssetOwner, PensionConfig, PersonPensionConfig } from "@/types";

export interface PersonPensionBreakdown {
    personKey: AssetOwner;
    active: boolean;
    grossAnnualSalary: number;
    voluntaryAmount: number;
    deductibleVoluntaryAmount: number;
    employerAmount: number;
    tfrAmount: number;
    annualTaxRefund: number;
    totalAnnualContribution: number;
}

export interface PensionBreakdownSummary {
    byPerson: Record<AssetOwner, PersonPensionBreakdown>;
    totalVoluntary: number;
    totalEmployer: number;
    totalTfr: number;
    annualTaxRefund: number;
    totalAnnualContribution: number;
}

export function computeContributionAmount(config: PersonPensionConfig["voluntaryContribution"], grossAnnualSalary: number): number {
    const salary = Math.max(0, grossAnnualSalary);
    if (config.mode === "percent") {
        return salary * (Math.max(0, config.value) / 100);
    }

    return Math.max(0, config.value);
}

function computePersonBreakdown(personKey: AssetOwner, config: PersonPensionConfig): PersonPensionBreakdown {
    const grossAnnualSalary = Math.max(0, config.grossAnnualSalary);
    const active = Boolean(config.active);

    if (!active) {
        return {
            personKey,
            active: false,
            grossAnnualSalary,
            voluntaryAmount: 0,
            deductibleVoluntaryAmount: 0,
            employerAmount: 0,
            tfrAmount: 0,
            annualTaxRefund: 0,
            totalAnnualContribution: 0,
        };
    }

    const voluntaryAmount = computeContributionAmount(config.voluntaryContribution, grossAnnualSalary);
    const deductibleVoluntaryAmount = Math.min(voluntaryAmount, MAX_PENSION_DEDUCTIBLE);
    const employerAmount = computeContributionAmount(config.employerContribution, grossAnnualSalary);
    const tfrAmount = grossAnnualSalary * TFR_RATE;
    const annualTaxRefund = Math.max(0, calculateIrpef(grossAnnualSalary) - calculateIrpef(grossAnnualSalary, deductibleVoluntaryAmount));

    return {
        personKey,
        active,
        grossAnnualSalary,
        voluntaryAmount,
        deductibleVoluntaryAmount,
        employerAmount,
        tfrAmount,
        annualTaxRefund,
        totalAnnualContribution: voluntaryAmount + employerAmount + tfrAmount,
    };
}

export function computePensionBreakdown(config: PensionConfig): PensionBreakdownSummary {
    const person1 = computePersonBreakdown("person1", config.person1);
    const person2 = computePersonBreakdown("person2", config.person2);

    return {
        byPerson: {
            person1,
            person2,
        },
        totalVoluntary: person1.voluntaryAmount + person2.voluntaryAmount,
        totalEmployer: person1.employerAmount + person2.employerAmount,
        totalTfr: person1.tfrAmount + person2.tfrAmount,
        annualTaxRefund: person1.annualTaxRefund + person2.annualTaxRefund,
        totalAnnualContribution: person1.totalAnnualContribution + person2.totalAnnualContribution,
    };
}
