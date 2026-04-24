import { z } from "zod";

export const loanCalculatorIntestatarioSchema = z.enum(["person1", "person2", "both"]);

export const loanCalculatorFinancingSimulationSchema = z.object({
    id: z.string().min(1),
    name: z.string().trim().max(80).optional().default(""),
    importo: z.number().min(0),
    anticipo: z.number().min(0),
    hasTradeIn: z.boolean().optional().default(false),
    tradeInValue: z.number().min(0).optional().default(0),
    tasso: z.number().min(0).max(100),
    durata: z.number().int().min(6).max(120),
}).superRefine((value, ctx) => {
    if (value.anticipo > value.importo) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["anticipo"],
            message: "L'anticipo non puo superare l'importo finanziato.",
        });
    }
});

export const loanCalculatorSavedScenarioInputSchema = z.object({
    name: z.string().trim().min(1).max(80),
    simulations: z.array(loanCalculatorFinancingSimulationSchema).min(1),
    intestatario: loanCalculatorIntestatarioSchema,
    enableDebtReductionSimulation: z.boolean(),
    selectedExistingLoanId: z.string().trim().min(1).nullable(),
    selectedPrepaymentAmount: z.number().min(0),
});

export const loanCalculatorSavedScenarioSchema = loanCalculatorSavedScenarioInputSchema.extend({
    id: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
