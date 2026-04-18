import { z } from "zod";

export const aiSettingsSchema = z.object({
    provider: z.enum(["gemini", "openrouter"]),
    apiKey: z.string().min(1).max(500).optional(),
    model: z.string().min(1).max(200),
});

export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;
