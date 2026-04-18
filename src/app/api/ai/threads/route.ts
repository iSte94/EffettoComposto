import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();
        const threads = await prisma.assistantThread.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                title: true,
                channel: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { messages: true } },
            },
        });
        return NextResponse.json({
            threads: threads.map((t) => ({
                id: t.id,
                title: t.title,
                channel: t.channel,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
                messageCount: t._count.messages,
            })),
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("GET /api/ai/threads error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const body = await req.json().catch(() => ({}));
        const title = typeof body.title === "string" && body.title.trim()
            ? body.title.trim().slice(0, 140)
            : "Nuova conversazione";
        const channel = body.channel === "telegram" ? "telegram" : "web";

        const thread = await prisma.assistantThread.create({
            data: { userId, title, channel },
        });
        return NextResponse.json({
            thread: {
                id: thread.id,
                title: thread.title,
                channel: thread.channel,
                createdAt: thread.createdAt.toISOString(),
                updatedAt: thread.updatedAt.toISOString(),
                messageCount: 0,
            },
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("POST /api/ai/threads error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}
