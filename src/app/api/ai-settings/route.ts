import { NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import { aiSettingsSchema } from "@/lib/validations/ai-settings";
import { clearStoredAiSettings, getStoredAiConfigStatus, saveStoredAiSettings } from "@/lib/ai/server-config";

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();
        return NextResponse.json({
            settings: await getStoredAiConfigStatus(userId),
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to get AI settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const raw = await req.json();
        const parsed = aiSettingsSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Dati non validi" },
                { status: 400 },
            );
        }

        const { provider, apiKey, model } = parsed.data;
        try {
            await saveStoredAiSettings({ userId, provider, model, apiKey });
        } catch (err) {
            console.error("AI settings save failed:", err);
            return NextResponse.json(
                { error: (err as Error).message || "ENCRYPTION_KEY non configurata sul server" },
                { status: 500 },
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to save AI settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const userId = await getAuthenticatedUserId();
        await clearStoredAiSettings(userId);
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to delete AI settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
