import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import { serializePendingAction } from "@/lib/ai/pending-actions";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;
        const thread = await prisma.assistantThread.findFirst({
            where: { id, userId },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                    include: {
                        attachments: {
                            orderBy: { createdAt: "asc" },
                        },
                        pendingActions: {
                            orderBy: { createdAt: "asc" },
                        },
                    },
                },
            },
        });
        if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({
            thread: {
                id: thread.id,
                title: thread.title,
                channel: thread.channel,
                createdAt: thread.createdAt.toISOString(),
                updatedAt: thread.updatedAt.toISOString(),
            },
            messages: thread.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                toolTrace: m.toolTrace ? JSON.parse(m.toolTrace) : null,
                attachments: m.attachments.map((attachment) => ({
                    id: attachment.id,
                    kind: attachment.kind,
                    mimeType: attachment.mimeType,
                    filename: attachment.filename,
                    size: attachment.size,
                    url: `/api/ai/attachments/${attachment.id}`,
                })),
                pendingActions: m.pendingActions.map(serializePendingAction),
                createdAt: m.createdAt.toISOString(),
            })),
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("GET /api/ai/threads/[id] error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: Ctx) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : null;
        if (!title) return NextResponse.json({ error: "Titolo mancante" }, { status: 400 });

        const updated = await prisma.assistantThread.updateMany({
            where: { id, userId },
            data: { title },
        });
        if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("PATCH /api/ai/threads/[id] error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: Ctx) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;
        const del = await prisma.assistantThread.deleteMany({
            where: { id, userId },
        });
        if (del.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("DELETE /api/ai/threads/[id] error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}
