import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import { aiSettingsSchema } from "@/lib/validations/ai-settings";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();
        const pref = await prisma.preference.findUnique({
            where: { userId },
            select: { aiRememberKeys: true, aiProvider: true, aiModel: true, aiApiKeyEnc: true },
        });

        if (!pref || !pref.aiRememberKeys || !pref.aiApiKeyEnc || !pref.aiProvider || !pref.aiModel) {
            return NextResponse.json({ settings: null });
        }

        let apiKey: string;
        try {
            apiKey = decrypt(pref.aiApiKeyEnc);
        } catch (err) {
            console.error("AI key decrypt failed:", err);
            return NextResponse.json({ settings: null, error: "decrypt_failed" });
        }

        return NextResponse.json({
            settings: { provider: pref.aiProvider, model: pref.aiModel, apiKey },
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
        let encrypted: string;
        try {
            encrypted = encrypt(apiKey);
        } catch (err) {
            console.error("AI key encrypt failed:", err);
            return NextResponse.json(
                { error: "ENCRYPTION_KEY non configurata sul server" },
                { status: 500 },
            );
        }

        await prisma.preference.upsert({
            where: { userId },
            update: {
                aiRememberKeys: true,
                aiProvider: provider,
                aiModel: model,
                aiApiKeyEnc: encrypted,
            },
            create: {
                userId,
                aiRememberKeys: true,
                aiProvider: provider,
                aiModel: model,
                aiApiKeyEnc: encrypted,
            },
        });

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
        await prisma.preference.updateMany({
            where: { userId },
            data: {
                aiRememberKeys: false,
                aiProvider: null,
                aiModel: null,
                aiApiKeyEnc: null,
            },
        });
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to delete AI settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
