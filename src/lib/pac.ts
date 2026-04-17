import type {
    AssetPacSchedule,
    PacCadence,
    PacTimingConfig,
} from "@/types";

export interface PacScheduleDueResult {
    due: boolean;
    reason?: string;
}

function getLastDayOfMonth(year: number, monthZeroBased: number): number {
    return new Date(year, monthZeroBased + 1, 0).getDate();
}

function matchesDayOfMonth(date: Date, timing: PacTimingConfig): boolean {
    if (timing.useLastDay) {
        return date.getDate() === getLastDayOfMonth(date.getFullYear(), date.getMonth());
    }

    return timing.dayOfMonth === date.getDate();
}

function matchesPeriodicMonth(date: Date, anchorMonth: number, intervalMonths: number): boolean {
    const currentMonth = date.getMonth() + 1;
    const offset = currentMonth - anchorMonth;
    return offset >= 0 && offset % intervalMonths === 0;
}

export function stringifyPacTimingConfig(timingConfig: PacTimingConfig): string {
    return JSON.stringify(timingConfig);
}

export function parsePacTimingConfig(raw: unknown): PacTimingConfig {
    if (typeof raw !== "string" || raw.trim() === "") return {};

    try {
        const parsed = JSON.parse(raw) as PacTimingConfig;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export function isPacScheduleDue(schedule: Pick<AssetPacSchedule, "cadence" | "timingConfig" | "active">, date: Date): PacScheduleDueResult {
    if (!schedule.active) return { due: false, reason: "inactive" };

    const timing = schedule.timingConfig;
    switch (schedule.cadence as PacCadence) {
        case "weekly":
            return { due: timing.weekday === date.getDay() };
        case "monthly":
            return { due: matchesDayOfMonth(date, timing) };
        case "quarterly":
            return {
                due: Boolean(timing.anchorMonth) && matchesPeriodicMonth(date, timing.anchorMonth!, 3) && matchesDayOfMonth(date, timing),
            };
        case "semiannual":
            return {
                due: Boolean(timing.anchorMonth) && matchesPeriodicMonth(date, timing.anchorMonth!, 6) && matchesDayOfMonth(date, timing),
            };
        case "annual":
            return {
                due: timing.month === (date.getMonth() + 1) && matchesDayOfMonth(date, timing),
            };
        default:
            return { due: false, reason: "unsupported_cadence" };
    }
}

export function formatDateKey(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

export function formatMonthKey(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    return `${date.getFullYear()}-${month}`;
}
