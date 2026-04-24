import { describe, expect, it } from "vitest";
import {
    buildCareerIncomeProjection,
    getProjectedMonthlyIncomeForOwner,
    parseCareerProgression,
} from "@/lib/finance/career-projection";

describe("career-projection", () => {
    it("falls back to the default career progression for invalid saved data", () => {
        const progression = parseCareerProgression("{invalid");

        expect(progression.yearsToSimulate).toBe(20);
        expect(progression.person1.annualRaisePct).toBe(3);
        expect(progression.person2.annualRaisePct).toBe(3);
    });

    it("projects annual raises and promotion bumps using the career dashboard convention", () => {
        const projection = buildCareerIncomeProjection({
            currentYear: 2026,
            person1MonthlyIncome: 2000,
            person2MonthlyIncome: 1500,
            progressionRaw: JSON.stringify({
                yearsToSimulate: 3,
                person1: {
                    annualRaisePct: 3,
                    expectedInflationPct: 2,
                    promotions: [{ id: "promo-1", targetYear: 2028, amount: 6000, description: "Scatto" }],
                },
                person2: {
                    annualRaisePct: 2,
                    expectedInflationPct: 2,
                    promotions: [],
                },
            }),
        });

        expect(projection.points).toHaveLength(4);
        expect(projection.points[0].person1AnnualIncome).toBe(24000);
        expect(projection.points[1].person1AnnualIncome).toBeCloseTo(24720);
        expect(projection.points[2].person1AnnualIncome).toBeCloseTo(31461.6);
        expect(projection.points[2].person1PromotionAmount).toBe(6000);
    });

    it("returns the projected income for the selected DTI owner", () => {
        const projection = buildCareerIncomeProjection({
            currentYear: 2026,
            person1MonthlyIncome: 2000,
            person2MonthlyIncome: 1500,
            progressionRaw: JSON.stringify({ yearsToSimulate: 0 }),
        });
        const point = projection.points[0];

        expect(point).toBeDefined();
        expect(getProjectedMonthlyIncomeForOwner(point!, "person1")).toBe(2000);
        expect(getProjectedMonthlyIncomeForOwner(point!, "person2")).toBe(1500);
        expect(getProjectedMonthlyIncomeForOwner(point!, "both")).toBe(3500);
    });
});
