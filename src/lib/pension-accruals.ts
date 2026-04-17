import prisma from "@/lib/prisma";
import { computePensionBreakdown } from "@/lib/finance/pension-optimizer";
import { parsePensionConfig } from "@/lib/pension-config";
import { parseOtherAssetsOwnership, stringifyOtherAssetsOwnership } from "@/lib/other-assets";
import { formatDateKey, formatMonthKey } from "@/lib/pac";
import type { AssetOwner } from "@/types";

interface PreferenceLike {
    pensionConfig: string;
    enablePensionOptimizer?: boolean;
    grossIncome?: number;
    pensionContribution?: number;
    employerContributionType?: string;
    employerContributionValue?: number;
}

interface SnapshotLike {
    pensionFund: number;
    otherAssetsOwnership: string;
}

interface ApplyPensionAccrualsInput {
    userId: string;
    preference: PreferenceLike;
    snapshot: SnapshotLike;
    targetDate: Date;
}

export interface ApplyPensionAccrualsResult {
    pensionFund: number;
    otherAssetsOwnership: string;
    createdAccruals: number;
}

function personToField(personKey: AssetOwner): "pensionFundP1" | "pensionFundP2" {
    return personKey === "person1" ? "pensionFundP1" : "pensionFundP2";
}

export async function applyMonthlyPensionAccruals(input: ApplyPensionAccrualsInput): Promise<ApplyPensionAccrualsResult> {
    const { userId, preference, snapshot, targetDate } = input;
    if (targetDate.getDate() !== 1) {
        return {
            pensionFund: snapshot.pensionFund,
            otherAssetsOwnership: snapshot.otherAssetsOwnership,
            createdAccruals: 0,
        };
    }

    if (!preference.enablePensionOptimizer) {
        return {
            pensionFund: snapshot.pensionFund,
            otherAssetsOwnership: snapshot.otherAssetsOwnership,
            createdAccruals: 0,
        };
    }

    const pensionConfig = parsePensionConfig(preference.pensionConfig, preference);
    const breakdown = computePensionBreakdown(pensionConfig);
    const accrualMonth = formatMonthKey(targetDate);
    const appliedDate = formatDateKey(targetDate);
    const ownership = parseOtherAssetsOwnership(snapshot.otherAssetsOwnership);

    let totalPensionFund = snapshot.pensionFund;
    let createdAccruals = 0;

    for (const personKey of ["person1", "person2"] as AssetOwner[]) {
        const person = breakdown.byPerson[personKey];
        if (!person.active || person.totalAnnualContribution <= 0) continue;

        const existing = await prisma.pensionFundAccrual.findUnique({
            where: {
                userId_personKey_accrualMonth: {
                    userId,
                    personKey,
                    accrualMonth,
                },
            },
        });
        if (existing) continue;

        const voluntaryAmount = person.voluntaryAmount / 12;
        const employerAmount = person.employerAmount / 12;
        const tfrAmount = person.tfrAmount / 12;
        const totalAmount = voluntaryAmount + employerAmount + tfrAmount;

        await prisma.pensionFundAccrual.create({
            data: {
                userId,
                personKey,
                accrualMonth,
                voluntaryAmount,
                employerAmount,
                tfrAmount,
                totalAmount,
                appliedDate,
            },
        });

        ownership[personToField(personKey)] += totalAmount;
        totalPensionFund += totalAmount;
        createdAccruals++;
    }

    return {
        pensionFund: totalPensionFund,
        otherAssetsOwnership: stringifyOtherAssetsOwnership(ownership),
        createdAccruals,
    };
}
