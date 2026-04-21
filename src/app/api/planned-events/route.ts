import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod/v4";
import prisma from "@/lib/prisma";
import {
    getAuthenticatedUserId,
    PRIVATE_NO_STORE_HEADERS,
    UnauthorizedError,
    unauthorizedResponse,
} from "@/lib/api-auth";
import {
    normalizePlannedFinancialEventInput,
    plannedFinancialEventIdSchema,
    plannedFinancialEventInputSchema,
    plannedFinancialEventPatchSchema,
} from "@/lib/validations/planned-events";

function toPlannedEventCreateInput(
    userId: string,
    data: ReturnType<typeof normalizePlannedFinancialEventInput>,
): Prisma.PlannedFinancialEventUncheckedCreateInput {
    return {
        userId,
        title: data.title,
        direction: data.direction,
        kind: data.kind,
        category: data.category,
        eventMonth: data.eventMonth,
        amount: data.amount,
        upfrontAmount: data.upfrontAmount ?? null,
        financedAmount: data.financedAmount ?? null,
        interestRate: data.interestRate ?? null,
        durationMonths: data.durationMonths ?? null,
        status: data.status,
        notes: data.notes ?? null,
    };
}

function toPlannedEventUpdateInput(
    data: ReturnType<typeof normalizePlannedFinancialEventInput>,
): Prisma.PlannedFinancialEventUncheckedUpdateInput {
    return {
        title: data.title,
        direction: data.direction,
        kind: data.kind,
        category: data.category,
        eventMonth: data.eventMonth,
        amount: data.amount,
        upfrontAmount: data.upfrontAmount ?? null,
        financedAmount: data.financedAmount ?? null,
        interestRate: data.interestRate ?? null,
        durationMonths: data.durationMonths ?? null,
        status: data.status,
        notes: data.notes ?? null,
    };
}

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();
        const events = await prisma.plannedFinancialEvent.findMany({
            where: { userId },
            orderBy: [
                { eventMonth: "asc" },
                { createdAt: "desc" },
            ],
        });

        return NextResponse.json(
            { events },
            { headers: PRIVATE_NO_STORE_HEADERS },
        );
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to load planned events:", error);
        return NextResponse.json({ error: "Errore server" }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const body = await req.json();
        const parsed = plannedFinancialEventInputSchema.parse(body);
        const normalized = normalizePlannedFinancialEventInput(parsed);

        const event = await prisma.plannedFinancialEvent.create({
            data: toPlannedEventCreateInput(userId, normalized),
        });

        return NextResponse.json(
            { event },
            { status: 201, headers: PRIVATE_NO_STORE_HEADERS },
        );
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Dati non validi", details: error.issues },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        console.error("Failed to create planned event:", error);
        return NextResponse.json({ error: "Errore server" }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const body = await req.json();
        const { id, ...patch } = plannedFinancialEventPatchSchema.parse(body);

        const existing = await prisma.plannedFinancialEvent.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Evento non trovato" }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
        }

        const merged = plannedFinancialEventInputSchema.parse({
            title: existing.title,
            direction: existing.direction,
            kind: existing.kind,
            category: existing.category,
            eventMonth: existing.eventMonth,
            amount: existing.amount,
            upfrontAmount: existing.upfrontAmount,
            financedAmount: existing.financedAmount,
            interestRate: existing.interestRate,
            durationMonths: existing.durationMonths,
            status: existing.status,
            notes: existing.notes,
            ...patch,
        });

        const normalized = normalizePlannedFinancialEventInput(merged);
        const event = await prisma.plannedFinancialEvent.update({
            where: { id },
            data: toPlannedEventUpdateInput(normalized),
        });

        return NextResponse.json(
            { event },
            { headers: PRIVATE_NO_STORE_HEADERS },
        );
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Dati non validi", details: error.issues },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        console.error("Failed to update planned event:", error);
        return NextResponse.json({ error: "Errore server" }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const body = await req.json();
        const { id } = plannedFinancialEventIdSchema.parse(body);

        const existing = await prisma.plannedFinancialEvent.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Evento non trovato" }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
        }

        await prisma.plannedFinancialEvent.delete({ where: { id } });
        return NextResponse.json(
            { success: true },
            { headers: PRIVATE_NO_STORE_HEADERS },
        );
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Dati non validi", details: error.issues },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        console.error("Failed to delete planned event:", error);
        return NextResponse.json({ error: "Errore server" }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
}
