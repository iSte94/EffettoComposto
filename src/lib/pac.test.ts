import { describe, expect, it } from "vitest";
import { formatDateKey, formatMonthKey, isPacScheduleDue, parsePacTimingConfig, stringifyPacTimingConfig } from "./pac";

describe("PAC scheduling", () => {
    it("riconosce il giorno settimanale configurato", () => {
        const monday = new Date(2026, 3, 20);
        const tuesday = new Date(2026, 3, 21);

        const schedule = {
            active: true,
            cadence: "weekly" as const,
            timingConfig: { weekday: 1 },
        };

        expect(isPacScheduleDue(schedule, monday).due).toBe(true);
        expect(isPacScheduleDue(schedule, tuesday).due).toBe(false);
    });

    it("supporta giorno mese 1-28 e ultimo giorno del mese", () => {
        expect(isPacScheduleDue({
            active: true,
            cadence: "monthly" as const,
            timingConfig: { dayOfMonth: 15 },
        }, new Date(2026, 3, 15)).due).toBe(true);

        expect(isPacScheduleDue({
            active: true,
            cadence: "monthly" as const,
            timingConfig: { useLastDay: true },
        }, new Date(2024, 1, 29)).due).toBe(true);
    });

    it("calcola correttamente cadenze trimestrali e semestrali da un mese iniziale", () => {
        const quarterly = { active: true, cadence: "quarterly" as const, timingConfig: { anchorMonth: 2, dayOfMonth: 10 } };
        expect(isPacScheduleDue(quarterly, new Date(2026, 1, 10)).due).toBe(true);
        expect(isPacScheduleDue(quarterly, new Date(2026, 4, 10)).due).toBe(true);
        expect(isPacScheduleDue(quarterly, new Date(2026, 5, 10)).due).toBe(false);

        const semiannual = { active: true, cadence: "semiannual" as const, timingConfig: { anchorMonth: 3, dayOfMonth: 5 } };
        expect(isPacScheduleDue(semiannual, new Date(2026, 2, 5)).due).toBe(true);
        expect(isPacScheduleDue(semiannual, new Date(2026, 8, 5)).due).toBe(true);
        expect(isPacScheduleDue(semiannual, new Date(2026, 5, 5)).due).toBe(false);
    });

    it("supporta annuale e formattazioni chiave idempotenti", () => {
        const schedule = {
            active: true,
            cadence: "annual" as const,
            timingConfig: { month: 12, dayOfMonth: 1 },
        };

        const date = new Date(2026, 11, 1);
        expect(isPacScheduleDue(schedule, date).due).toBe(true);
        expect(formatDateKey(date)).toBe("2026-12-01");
        expect(formatMonthKey(date)).toBe("2026-12");
    });

    it("serializza e deserializza timing config in modo tollerante", () => {
        const raw = stringifyPacTimingConfig({ dayOfMonth: 7 });
        expect(parsePacTimingConfig(raw)).toEqual({ dayOfMonth: 7 });
        expect(parsePacTimingConfig("non-json")).toEqual({});
        expect(isPacScheduleDue({ active: false, cadence: "monthly", timingConfig: { dayOfMonth: 7 } }, new Date(2026, 3, 7)).due).toBe(false);
    });
});
