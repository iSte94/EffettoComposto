import { describe, expect, it } from "vitest";
import type { PlannedFinancialEvent } from "@/types";
import {
    buildPlannedEventsSummary,
    buildPlannedEventsTimeline,
    getPlannedEventMonthlyPayment,
    simulateLiquidityPath,
} from "./planned-events";

const baseEvents: PlannedFinancialEvent[] = [
    {
        id: "event-car",
        title: "Auto nuova",
        direction: "outflow",
        kind: "financed",
        category: "auto",
        eventMonth: "2027-02",
        amount: 12000,
        upfrontAmount: 3000,
        financedAmount: 9000,
        interestRate: 0,
        durationMonths: 3,
        status: "planned",
        notes: null,
    },
    {
        id: "event-trip",
        title: "Viaggio Giappone",
        direction: "outflow",
        kind: "one_time",
        category: "viaggio",
        eventMonth: "2027-06",
        amount: 5000,
        status: "planned",
        notes: null,
    },
    {
        id: "event-inheritance",
        title: "Eredita",
        direction: "inflow",
        kind: "one_time",
        category: "eredita",
        eventMonth: "2027-04",
        amount: 8000,
        status: "planned",
        notes: null,
    },
    {
        id: "event-canceled",
        title: "Evento annullato",
        direction: "outflow",
        kind: "one_time",
        category: "altro",
        eventMonth: "2027-03",
        amount: 9999,
        status: "canceled",
        notes: null,
    },
];

describe("planned-events engine", () => {
    it("espande un'uscita una tantum nel mese corretto", () => {
        const timeline = buildPlannedEventsTimeline(baseEvents, {
            startMonth: "2027-01",
            months: 12,
        });

        expect(timeline.monthly[5].month).toBe("2027-06");
        expect(timeline.monthly[5].capitalDelta).toBe(-5000);
        expect(timeline.monthly[5].outflows).toBe(5000);
    });

    it("espande un evento finanziato come anticipo piu' rate", () => {
        const timeline = buildPlannedEventsTimeline(baseEvents, {
            startMonth: "2027-01",
            months: 6,
        });

        const monthlyPayment = getPlannedEventMonthlyPayment(baseEvents[0]);
        expect(monthlyPayment).toBe(3000);

        expect(timeline.monthly[1].capitalDelta).toBe(-3000);
        expect(timeline.monthly[1].netCashflowDelta).toBe(-3000);
        expect(timeline.monthly[2].netCashflowDelta).toBe(-3000);
        expect(timeline.monthly[3].netCashflowDelta).toBe(-3000);
        expect(timeline.monthly[4].netCashflowDelta).toBe(0);
        expect(timeline.monthly[1].debtServiceDelta).toBe(3000);
        expect(timeline.monthly[1].activeFinancedCount).toBe(1);
    });

    it("ignora gli eventi canceled o realized", () => {
        const timeline = buildPlannedEventsTimeline(baseEvents, {
            startMonth: "2027-01",
            months: 6,
        });

        expect(timeline.monthly[2].outflows).toBe(3000);
        expect(timeline.monthly[2].eventIds).not.toContain("event-canceled");
    });

    it("sintetizza influssi, deflussi e prossimi eventi", () => {
        const summary = buildPlannedEventsSummary(baseEvents, [12], "2027-01");

        expect(summary.nextEvent?.id).toBe("event-car");
        expect(summary.windows[12].inflows).toBe(8000);
        expect(summary.windows[12].outflows).toBe(17000);
        expect(summary.windows[12].netImpact).toBe(-9000);
        expect(summary.windows[12].debtService).toBe(9000);
        expect(summary.maxConcurrentFinancedEvents).toBe(1);
    });

    it("simula il percorso di liquidita' e segnala il primo mese negativo", () => {
        const timeline = buildPlannedEventsTimeline([
            {
                id: "event-cash",
                title: "Caparra",
                direction: "outflow",
                kind: "one_time",
                category: "casa",
                eventMonth: "2027-01",
                amount: 5000,
                status: "planned",
                notes: null,
            },
        ], {
            startMonth: "2027-01",
            months: 3,
        });

        const liquidity = simulateLiquidityPath({
            startingLiquidity: 2000,
            baseMonthlyNetFlow: 500,
            timeline,
        });

        expect(liquidity.minLiquidity).toBeLessThan(0);
        expect(liquidity.firstNegativeMonth).toBe("2027-01");
    });
});
