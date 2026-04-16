import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

interface Ctx { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Ctx) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id: threadId } = await params;
        const body = await req.json().catch(() => ({}));
        const role = body.role === "assistant" ? "assistant" : body.role === "user" ? "user" : null;
        const content = typeof body.content === "string" ? body.content : null;
        const toolTrace = Array.isArray(body.toolTrace) ? body.toolTrace : null;

        if (!role || content === null) {
            return NextResponse.json({ error: "role e content obbligatori" }, { status: 400 });
        }

        const thread = await prisma.assistantThread.findFirst({
            where: { id: threadId, userId },
            select: { id: true, messages: { select: { id: true }, take: 1 } },
        });
        if (!thread) return NextResponse.json({ error: "Thread non trovato" }, { status: 404 });

        const created = await prisma.assistantMessage.create({
            data: {
                threadId,
                role,
                content: content.slice(0, 200_000),
                toolTrace: toolTrace ? JSON.stringify(toolTrace).slice(0, 500_000) : null,
            },
        });

        const updateData: { updatedAt: Date; title?: string } = { updatedAt: new Date() };
        // Se e' il primo messaggio user, usa il contenuto come titolo auto-generato
        if (role === "user" && thread.messages.length === 0) {
            updateData.title = content.slice(0, 60).replace(/\s+/g, " ").trim() || "Nuova conversazione";
        }
        await prisma.assistantThread.update({
            where: { id: threadId },
            data: updateData,
        });

        return NextResponse.json({
            message: {
                id: created.id,
                role: created.role,
                content: created.content,
                toolTrace: created.toolTrace ? JSON.parse(created.toolTrace) : null,
                createdAt: created.createdAt.toISOString(),
            },
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("POST /api/ai/threads/[id]/messages error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}
