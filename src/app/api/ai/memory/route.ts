import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

const VALID_CATEGORIES = ["profilo", "obiettivo", "decisione", "preferenza", "contesto"] as const;

export async function GET(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");

        const where: { userId: string; category?: string } = { userId };
        if (category && (VALID_CATEGORIES as readonly string[]).includes(category)) {
            where.category = category;
        }

        const memory = await prisma.assistantMemory.findMany({
            where,
            orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
            take: 200,
        });

        return NextResponse.json({
            memory: memory.map((m) => ({
                id: m.id,
                category: m.category,
                fact: m.fact,
                pinned: m.pinned,
                source: m.source,
                createdAt: m.createdAt.toISOString(),
                updatedAt: m.updatedAt.toISOString(),
            })),
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("GET /api/ai/memory error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const body = await req.json().catch(() => ({}));
        const category = typeof body.category === "string" && (VALID_CATEGORIES as readonly string[]).includes(body.category)
            ? body.category
            : "contesto";
        const fact = typeof body.fact === "string" ? body.fact.trim().slice(0, 500) : "";
        const pinned = Boolean(body.pinned);
        const source = body.source === "auto" ? "auto" : "manual";

        if (!fact) return NextResponse.json({ error: "Fact vuoto" }, { status: 400 });

        // Dedup: se esiste gia' un fatto identico, aggiorna updatedAt
        const existing = await prisma.assistantMemory.findFirst({
            where: { userId, fact },
        });
        if (existing) {
            const updated = await prisma.assistantMemory.update({
                where: { id: existing.id },
                data: { category, pinned: pinned || existing.pinned, updatedAt: new Date() },
            });
            return NextResponse.json({
                memory: {
                    id: updated.id,
                    category: updated.category,
                    fact: updated.fact,
                    pinned: updated.pinned,
                    source: updated.source,
                    createdAt: updated.createdAt.toISOString(),
                    updatedAt: updated.updatedAt.toISOString(),
                },
                deduplicated: true,
            });
        }

        const created = await prisma.assistantMemory.create({
            data: { userId, category, fact, pinned, source },
        });
        return NextResponse.json({
            memory: {
                id: created.id,
                category: created.category,
                fact: created.fact,
                pinned: created.pinned,
                source: created.source,
                createdAt: created.createdAt.toISOString(),
                updatedAt: created.updatedAt.toISOString(),
            },
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("POST /api/ai/memory error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}
