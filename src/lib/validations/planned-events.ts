import { z } from "zod/v4";

const plannedFinancialEventDirectionSchema = z.enum(["outflow", "inflow"]);
const plannedFinancialEventKindSchema = z.enum(["one_time", "financed"]);
const plannedFinancialEventStatusSchema = z.enum(["planned", "realized", "canceled"]);

const yearMonthSchema = z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Il mese deve essere nel formato YYYY-MM")
    .refine((value) => {
        const [, month] = value.split("-").map(Number);
        return Number.isFinite(month) && month >= 1 && month <= 12;
    }, "Il mese deve essere compreso tra 01 e 12");

const nullableMoneySchema = z.number().min(0).nullable().optional();
const nullableRateSchema = z.number().min(0).max(100).nullable().optional();
const nullableDurationSchema = z.number().int().min(1).max(600).nullable().optional();

const plannedFinancialEventBaseSchema = z.object({
    title: z.string().trim().min(1, "Inserisci un titolo").max(120, "Titolo troppo lungo"),
    direction: plannedFinancialEventDirectionSchema.default("outflow"),
    kind: plannedFinancialEventKindSchema.default("one_time"),
    category: z.string().trim().min(1, "Seleziona una categoria").max(40, "Categoria troppo lunga"),
    eventMonth: yearMonthSchema,
    amount: z.number().positive("L'importo deve essere maggiore di zero"),
    upfrontAmount: nullableMoneySchema,
    financedAmount: nullableMoneySchema,
    interestRate: nullableRateSchema,
    durationMonths: nullableDurationSchema,
    status: plannedFinancialEventStatusSchema.default("planned"),
    notes: z
        .string()
        .max(1000, "Le note sono troppo lunghe")
        .nullable()
        .optional()
        .transform((value) => {
            if (value == null) return null;
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
        }),
});

export const plannedFinancialEventInputSchema = plannedFinancialEventBaseSchema.superRefine((value, ctx) => {
    if (value.direction === "inflow" && value.kind !== "one_time") {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["kind"],
            message: "Le entrate supportano solo il pagamento una tantum",
        });
    }

    if (value.kind !== "financed") {
        return;
    }

    if (value.direction !== "outflow") {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["direction"],
            message: "Un evento finanziato deve essere un'uscita",
        });
    }

    if (value.durationMonths == null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["durationMonths"],
            message: "Inserisci la durata del finanziamento",
        });
    }

    if (value.interestRate == null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["interestRate"],
            message: "Inserisci il tasso del finanziamento",
        });
    }

    const upfrontAmount = value.upfrontAmount ?? 0;
    const financedAmount = value.financedAmount ?? (value.amount - upfrontAmount);

    if (upfrontAmount > value.amount) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["upfrontAmount"],
            message: "L'anticipo non puo' superare l'importo totale",
        });
    }

    if (financedAmount <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["financedAmount"],
            message: "La quota finanziata deve essere maggiore di zero",
        });
    }

    if (Math.abs((upfrontAmount + financedAmount) - value.amount) > 0.01) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["financedAmount"],
            message: "Anticipo e quota finanziata devono sommare l'importo totale",
        });
    }
});

export const plannedFinancialEventIdSchema = z.object({
    id: z.string().uuid(),
});

export const plannedFinancialEventPatchSchema = plannedFinancialEventBaseSchema.partial().extend({
    id: z.string().uuid(),
});

export type PlannedFinancialEventInput = z.infer<typeof plannedFinancialEventInputSchema>;
export type PlannedFinancialEventPatch = z.infer<typeof plannedFinancialEventPatchSchema>;

export function normalizePlannedFinancialEventInput(
    input: PlannedFinancialEventInput,
): PlannedFinancialEventInput {
    const base = {
        ...input,
        title: input.title.trim(),
        category: input.category.trim(),
        notes: input.notes ?? null,
    };

    if (base.kind !== "financed") {
        return {
            ...base,
            upfrontAmount: null,
            financedAmount: null,
            interestRate: null,
            durationMonths: null,
        };
    }

    const upfrontAmount = base.upfrontAmount ?? 0;
    const financedAmount = base.financedAmount ?? Math.max(0, base.amount - upfrontAmount);

    return {
        ...base,
        upfrontAmount,
        financedAmount,
        interestRate: base.interestRate ?? 0,
        durationMonths: base.durationMonths ?? null,
    };
}
