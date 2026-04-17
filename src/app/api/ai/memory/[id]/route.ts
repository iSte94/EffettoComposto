import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

interface Ctx { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const data: { pinned?: boolean; fact?: string; category?: string } = {};
        if (typeof body.pinned === "boolean") data.pinned = body.pinned;
        if (typeof body.fact === "string") data.fact = body.fact.trim().slice(0, 500);
        if (typeof body.category === "string") data.category = body.category;

        const upd = await prisma.assistantMemory.updateMany({
            where: { id, userId },
            data,
        });
        if (upd.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("PATCH /api/ai/memory/[id] error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: Ctx) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;
        const del = await prisma.assistantMemory.deleteMany({ where: { id, userId } });
        if (del.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("DELETE /api/ai/memory/[id] error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}
