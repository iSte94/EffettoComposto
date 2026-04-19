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

    it("supporta cadenze che attraversano l'anno solare (anchor nel 2o semestre)", () => {
        // Regressione: con anchorMonth=11 quarterly, prima tutti i mesi
        // Feb/Mag/Ago venivano scartati perche' `offset = currentMonth - 11 < 0`.
        // Conseguenza: su 4 esecuzioni previste all'anno, solo 1 veniva eseguita.
        const quarterlyNov = {
            active: true,
            cadence: "quarterly" as const,
            timingConfig: { anchorMonth: 11, dayOfMonth: 10 },
        };
        expect(isPacScheduleDue(quarterlyNov, new Date(2026, 10, 10)).due).toBe(true);  // Nov
        expect(isPacScheduleDue(quarterlyNov, new Date(2027, 1, 10)).due).toBe(true);   // Feb
        expect(isPacScheduleDue(quarterlyNov, new Date(2027, 4, 10)).due).toBe(true);   // Mag
        expect(isPacScheduleDue(quarterlyNov, new Date(2027, 7, 10)).due).toBe(true);   // Ago
        expect(isPacScheduleDue(quarterlyNov, new Date(2027, 2, 10)).due).toBe(false);  // Mar
        expect(isPacScheduleDue(quarterlyNov, new Date(2027, 11, 10)).due).toBe(false); // Dic

        const semiannualAug = {
            active: true,
            cadence: "semiannual" as const,
            timingConfig: { anchorMonth: 8, dayOfMonth: 1 },
        };
        expect(isPacScheduleDue(semiannualAug, new Date(2026, 7, 1)).due).toBe(true);  // Ago
        expect(isPacScheduleDue(semiannualAug, new Date(2027, 1, 1)).due).toBe(true);  // Feb
        expect(isPacScheduleDue(semiannualAug, new Date(2026, 0, 1)).due).toBe(false); // Gen (non allineato)
    });

    it("rifiuta anchorMonth fuori range senza errori (guardrail difensivo)", () => {
        // Se il DB contiene un anchorMonth corrotto (0, 13, NaN) la schedule non
        // deve mai attivarsi silenziosamente su un mese casuale.
        const invalidAnchor = {
            active: true,
            cadence: "quarterly" as const,
            timingConfig: { anchorMonth: 0, dayOfMonth: 1 },
        };
        expect(isPacScheduleDue(invalidAnchor, new Date(2026, 0, 1)).due).toBe(false);

        const outOfRange = {
            active: true,
            cadence: "semiannual" as const,
            timingConfig: { anchorMonth: 13, dayOfMonth: 1 },
        };
        expect(isPacScheduleDue(outOfRange, new Date(2026, 0, 1)).due).toBe(false);
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
