import { calculateMortgagePayment } from "@/lib/finance/loans";
import type { PlannedFinancialEvent } from "@/types";

export interface PlannedEventsTimelineMonth {
    month: string;
    capitalDelta: number;
    netCashflowDelta: number;
    debtServiceDelta: number;
    inflows: number;
    outflows: number;
    activeFinancedCount: number;
    eventIds: string[];
}

export interface PlannedEventsTimeline {
    startMonth: string;
    months: number;
    monthly: PlannedEventsTimelineMonth[];
}

export interface PlannedEventsWindowSummary {
    windowMonths: number;
    inflows: number;
    outflows: number;
    netImpact: number;
    debtService: number;
    maxConcurrentFinancedEvents: number;
}

export interface PlannedEventsSummary {
    nextEvent: PlannedFinancialEvent | null;
    windows: Record<number, PlannedEventsWindowSummary>;
    activeFinancedNow: number;
    maxConcurrentFinancedEvents: number;
}

export interface LiquidityPathPoint {
    month: string;
    liquidity: number;
    baseNetFlow: number;
    eventNetImpact: number;
}

export interface LiquidityPathResult {
    points: LiquidityPathPoint[];
    minLiquidity: number;
    finalLiquidity: number;
    firstNegativeMonth: string | null;
}

export interface BuildPlannedEventsTimelineOptions {
    startMonth?: string;
    months: number;
}

const ACTIVE_STATUSES = new Set<PlannedFinancialEvent["status"]>(["planned"]);

function parseYearMonth(value: string): { year: number; month: number } | null {
    if (!/^\d{4}-\d{2}$/.test(value)) return null;
    const [year, month] = value.split("-").map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
    return { year, month };
}

export function formatYearMonth(date: Date): string {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

export function addMonthsToYearMonth(value: string, monthsToAdd: number): string {
    const parsed = parseYearMonth(value);
    if (!parsed) return value;
    const date = new Date(parsed.year, parsed.month - 1 + monthsToAdd, 1);
    return formatYearMonth(date);
}

export function monthsBetweenYearMonths(start: string, end: string): number | null {
    const startParsed = parseYearMonth(start);
    const endParsed = parseYearMonth(end);
    if (!startParsed || !endParsed) return null;
    return ((endParsed.year - startParsed.year) * 12) + (endParsed.month - startParsed.month);
}

export function getPlannedEventUpfrontAmount(event: PlannedFinancialEvent): number {
    if (event.kind !== "financed") return Math.max(0, event.amount);
    return Math.max(0, event.upfrontAmount ?? 0);
}

export function getPlannedEventFinancedAmount(event: PlannedFinancialEvent): number {
    if (event.kind !== "financed") return 0;
    const upfrontAmount = getPlannedEventUpfrontAmount(event);
    const fallbackFinanced = Math.max(0, event.amount - upfrontAmount);
    return Math.max(0, event.financedAmount ?? fallbackFinanced);
}

export function getPlannedEventMonthlyPayment(event: PlannedFinancialEvent): number {
    if (event.kind !== "financed") return 0;
    const financedAmount = getPlannedEventFinancedAmount(event);
    const durationMonths = Math.max(0, event.durationMonths ?? 0);
    if (financedAmount <= 0 || durationMonths <= 0) return 0;

    return calculateMortgagePayment({
        loanAmount: financedAmount,
        annualRatePct: Math.max(0, event.interestRate ?? 0),
        years: durationMonths / 12,
    }).monthlyPayment;
}

export function buildPlannedEventsTimeline(
    events: PlannedFinancialEvent[],
    options: BuildPlannedEventsTimelineOptions,
): PlannedEventsTimeline {
    const startMonth = options.startMonth ?? formatYearMonth(new Date());
    const totalMonths = Math.max(0, Math.trunc(options.months));
    const monthly = Array.from({ length: totalMonths }, (_, index) => ({
        month: addMonthsToYearMonth(startMonth, index),
        capitalDelta: 0,
        netCashflowDelta: 0,
        debtServiceDelta: 0,
        inflows: 0,
        outflows: 0,
        activeFinancedCount: 0,
        eventIds: [] as string[],
    }));

    for (const event of events) {
        if (!ACTIVE_STATUSES.has(event.status)) continue;

        const startIndex = monthsBetweenYearMonths(startMonth, event.eventMonth);
        if (startIndex == null) continue;

        if (event.kind === "one_time") {
            if (startIndex < 0 || startIndex >= totalMonths) continue;
            const signedAmount = event.direction === "inflow"
                ? Math.max(0, event.amount)
                : -Math.max(0, event.amount);
            monthly[startIndex].capitalDelta += signedAmount;
            if (signedAmount >= 0) monthly[startIndex].inflows += signedAmount;
            else monthly[startIndex].outflows += Math.abs(signedAmount);
            monthly[startIndex].eventIds.push(event.id);
            continue;
        }

        const upfrontAmount = getPlannedEventUpfrontAmount(event);
        const monthlyPayment = getPlannedEventMonthlyPayment(event);
        const durationMonths = Math.max(0, event.durationMonths ?? 0);

        if (startIndex >= 0 && startIndex < totalMonths && upfrontAmount > 0) {
            monthly[startIndex].capitalDelta -= upfrontAmount;
            monthly[startIndex].outflows += upfrontAmount;
            monthly[startIndex].eventIds.push(event.id);
        }

        for (let paymentIndex = 0; paymentIndex < durationMonths; paymentIndex++) {
            const monthIndex = startIndex + paymentIndex;
            if (monthIndex < 0 || monthIndex >= totalMonths) continue;

            monthly[monthIndex].netCashflowDelta -= monthlyPayment;
            monthly[monthIndex].debtServiceDelta += monthlyPayment;
            monthly[monthIndex].outflows += monthlyPayment;
            monthly[monthIndex].activeFinancedCount += 1;
            if (!monthly[monthIndex].eventIds.includes(event.id)) {
                monthly[monthIndex].eventIds.push(event.id);
            }
        }
    }

    return {
        startMonth,
        months: totalMonths,
        monthly,
    };
}

export function buildPlannedEventsSummary(
    events: PlannedFinancialEvent[],
    windowMonths: number[] = [12, 24, 36],
    startMonth = formatYearMonth(new Date()),
): PlannedEventsSummary {
    const maxWindow = Math.max(0, ...windowMonths);
    const timeline = buildPlannedEventsTimeline(events, { startMonth, months: maxWindow });
    const nextEvent = [...events]
        .filter((event) => ACTIVE_STATUSES.has(event.status))
        .filter((event) => {
            const diff = monthsBetweenYearMonths(startMonth, event.eventMonth);
            return diff != null && diff >= 0;
        })
        .sort((a, b) => a.eventMonth.localeCompare(b.eventMonth))[0] ?? null;

    const windows: Record<number, PlannedEventsWindowSummary> = {};
    for (const window of windowMonths) {
        const slice = timeline.monthly.slice(0, Math.max(0, window));
        windows[window] = {
            windowMonths: window,
            inflows: slice.reduce((acc, month) => acc + month.inflows, 0),
            outflows: slice.reduce((acc, month) => acc + month.outflows, 0),
            netImpact: slice.reduce((acc, month) => acc + month.capitalDelta + month.netCashflowDelta, 0),
            debtService: slice.reduce((acc, month) => acc + month.debtServiceDelta, 0),
            maxConcurrentFinancedEvents: slice.reduce((acc, month) => Math.max(acc, month.activeFinancedCount), 0),
        };
    }

    return {
        nextEvent,
        windows,
        activeFinancedNow: timeline.monthly[0]?.activeFinancedCount ?? 0,
        maxConcurrentFinancedEvents: timeline.monthly.reduce((acc, month) => Math.max(acc, month.activeFinancedCount), 0),
    };
}

export function simulateLiquidityPath(args: {
    startingLiquidity: number;
    baseMonthlyNetFlow: number;
    timeline: PlannedEventsTimeline;
    months?: number;
}): LiquidityPathResult {
    const months = Math.max(0, Math.min(args.months ?? args.timeline.months, args.timeline.months));
    let liquidity = args.startingLiquidity;
    let minLiquidity = args.startingLiquidity;
    let firstNegativeMonth: string | null = args.startingLiquidity < 0
        ? args.timeline.monthly[0]?.month ?? args.timeline.startMonth
        : null;

    const points: LiquidityPathPoint[] = [];

    for (let index = 0; index < months; index++) {
        const month = args.timeline.monthly[index];
        const eventNetImpact = month.capitalDelta + month.netCashflowDelta;
        liquidity += args.baseMonthlyNetFlow + eventNetImpact;
        minLiquidity = Math.min(minLiquidity, liquidity);
        if (liquidity < 0 && firstNegativeMonth == null) {
            firstNegativeMonth = month.month;
        }

        points.push({
            month: month.month,
            liquidity,
            baseNetFlow: args.baseMonthlyNetFlow,
            eventNetImpact,
        });
    }

    return {
        points,
        minLiquidity,
        finalLiquidity: liquidity,
        firstNegativeMonth,
    };
}
