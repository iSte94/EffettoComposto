import { z } from "zod";

const purchaseCategorySchema = z.enum(["auto", "immobile", "arredamento", "altro"]);

export const advisorSimulationSchema = z.object({
    category: purchaseCategorySchema,
    itemName: z.string().trim().max(120),
    totalPrice: z.number().positive(),
    downPayment: z.number().min(0),
    financingRate: z.number().min(0).max(100),
    financingYears: z.number().min(0).max(50),
    isFinanced: z.boolean(),
    annualInsurance: z.number().min(0),
    annualMaintenance: z.number().min(0),
    monthlyFuel: z.number().min(0),
    depreciationRate: z.number().min(0).max(100),
    monthlyRent: z.number().min(0),
    condominiumFees: z.number().min(0),
    imuTax: z.number().min(0),
    usefulLifeYears: z.number().int().min(1).max(50),
}).superRefine((value, ctx) => {
    if (value.downPayment > value.totalPrice) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["downPayment"],
            message: "L'anticipo non puo superare il prezzo totale.",
        });
    }
});

export const advisorScenarioSummarySchema = z.object({
    overallScore: z.number().min(0).max(100),
    monthlyPayment: z.number().min(0),
    totalInterest: z.number().min(0),
    totalTCO: z.number().min(0),
    cashOutlay: z.number().min(0),
    liquidityAfter: z.number(),
    emergencyMonthsLeft: z.number().min(0),
    fireDelayMonthsValue: z.number().nullable(),
    tcoYears: z.number().int().min(1).max(50),
});

export const advisorSavedScenarioInputSchema = z.object({
    simulation: advisorSimulationSchema,
    summary: advisorScenarioSummarySchema,
    note: z.string().trim().max(600).nullable().optional(),
    isShortlisted: z.boolean().optional(),
    linkedGoalId: z.string().uuid().nullable().optional(),
});

export const advisorSavedScenarioSchema = advisorSavedScenarioInputSchema.extend({
    id: z.string(),
    fingerprint: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export const advisorReminderInputSchema = z.object({
    triggerType: z.enum(["date", "emergency_fund"]),
    reminderAt: z.string().datetime().nullable().optional(),
    targetEmergencyMonths: z.number().min(1).max(24).nullable().optional(),
    note: z.string().trim().max(400).nullable().optional(),
}).superRefine((value, ctx) => {
    if (value.triggerType === "date" && !value.reminderAt) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["reminderAt"],
            message: "Scegli una data per il promemoria.",
        });
    }

    if (value.triggerType === "emergency_fund" && !value.targetEmergencyMonths) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["targetEmergencyMonths"],
            message: "Imposta la soglia del fondo emergenza.",
        });
    }
});

export const advisorReminderSchema = advisorReminderInputSchema.extend({
    id: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    scenarioId: z.string().nullable(),
    scenarioFingerprint: z.string().nullable(),
    itemName: z.string().trim().min(1).max(120),
    category: purchaseCategorySchema,
});

export const advisorPlanGoalSchema = z.object({
    name: z.string().trim().min(1).max(100),
    targetAmount: z.number().positive(),
    currentAmount: z.number().min(0).default(0),
    deadline: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
    category: z.enum(["general", "emergency", "house", "investment", "travel", "other"]).default("general"),
});

export const advisorWorkspaceActionSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("upsert_scenario"),
        scenario: advisorSavedScenarioInputSchema,
    }),
    z.object({
        action: z.literal("toggle_shortlist"),
        fingerprint: z.string().min(1),
        desired: z.boolean().optional(),
        scenario: advisorSavedScenarioInputSchema.optional(),
    }),
    z.object({
        action: z.literal("create_plan"),
        scenario: advisorSavedScenarioInputSchema,
        goal: advisorPlanGoalSchema,
    }),
    z.object({
        action: z.literal("create_reminder"),
        scenario: advisorSavedScenarioInputSchema,
        reminder: advisorReminderInputSchema,
    }),
    z.object({
        action: z.literal("delete_scenario"),
        id: z.string(),
    }),
    z.object({
        action: z.literal("delete_reminder"),
        id: z.string(),
    }),
]);

export type AdvisorWorkspaceAction = z.infer<typeof advisorWorkspaceActionSchema>;
