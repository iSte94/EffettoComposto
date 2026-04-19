import { NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import { getStoredAiConfigStatus } from "@/lib/ai/server-config";
import {
    deleteTelegramBotForUser,
    getTelegramBotStateForUser,
    saveTelegramBotForUser,
} from "@/lib/telegram";

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();
        return NextResponse.json({
            telegram: await getTelegramBotStateForUser(userId),
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("GET /api/telegram/bot error:", error);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const body = await req.json().catch(() => ({}));
        const botToken = typeof body.botToken === "string" ? body.botToken.trim() : "";

        if (!botToken) {
            return NextResponse.json({ error: "Token BotFather mancante" }, { status: 400 });
        }

        const aiConfig = await getStoredAiConfigStatus(userId);
        if (!aiConfig.hasStoredKey || !aiConfig.provider || !aiConfig.model) {
            return NextResponse.json({
                error: "Prima configura provider, modello e API key AI sul server",
            }, { status: 400 });
        }

        return NextResponse.json({
            telegram: await saveTelegramBotForUser({ userId, botToken }),
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("POST /api/telegram/bot error:", error);
        return NextResponse.json({ error: (error as Error).message || "Errore interno" }, { status: 400 });
    }
}

export async function DELETE() {
    try {
        const userId = await getAuthenticatedUserId();
        return NextResponse.json({
            telegram: await deleteTelegramBotForUser(userId),
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("DELETE /api/telegram/bot error:", error);
        return NextResponse.json({ error: (error as Error).message || "Errore interno" }, { status: 400 });
    }
}
