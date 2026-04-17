import { z } from "zod";

const pacCadenceSchema = z.enum(["weekly", "monthly", "quarterly", "semiannual", "annual"]);

export const pacTimingConfigSchema = z.object({
    weekday: z.number().int().min(0).max(6).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
    useLastDay: z.boolean().optional(),
    anchorMonth: z.number().int().min(1).max(12).optional(),
    month: z.number().int().min(1).max(12).optional(),
});

export const createPacScheduleSchema = z.object({
    assetKey: z.string().min(1),
    assetTicker: z.string().min(1).max(32),
    amountEur: z.number().positive(),
    cadence: pacCadenceSchema,
    timingConfig: pacTimingConfigSchema,
    active: z.boolean().optional(),
});

export const updatePacScheduleSchema = createPacScheduleSchema.partial().extend({
    active: z.boolean().optional(),
});
