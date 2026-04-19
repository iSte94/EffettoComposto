import { calculateIrpef } from "@/lib/finance/irpef";
import { MAX_PENSION_DEDUCTIBLE, TFR_RATE } from "@/lib/pension-config";
import type { AssetOwner, PensionConfig, PersonPensionConfig } from "@/types";

// Aliquota INPS lavoratori dipendenti standard (settore privato, aziende > 15 dipendenti).
// Usata per ricavare la base imponibile IRPEF (RAL − INPS) nel calcolo del rimborso
// fiscale da contribuzione pensionistica, dove il contratto specifico non è noto.
// Il valore 9.19% è la media di mercato più comune; l'approssimazione è accettabile
// perché l'errore residuo (< 1% di scarto sulle aliquote 5.84–9.49%) è trascurabile
// rispetto all'errore precedente, che spostava il reddito in uno scaglione sbagliato.
const DEFAULT_INPS_RATE = 0.0919;

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

    // BUG FIX: la base imponibile IRPEF è (RAL − INPS), non il RAL grezzo.
    // Usare il RAL diretto sovrastimava lo scaglione di riferimento: per RAL ≈ 28.500–33.000€
    // il contributo pensionistico veniva tassato al 33% anziché al 23% corretto,
    // generando rimborsi fiscali gonfiati fino al 43% (es. +166€/anno su 1.200€ di versamento).
    const imponibileIrpef = Math.max(0, grossAnnualSalary * (1 - DEFAULT_INPS_RATE));
    const annualTaxRefund = Math.max(0, calculateIrpef(imponibileIrpef) - calculateIrpef(imponibileIrpef, deductibleVoluntaryAmount));

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
