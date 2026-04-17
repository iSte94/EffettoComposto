import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import { parsePacTimingConfig, stringifyPacTimingConfig } from "@/lib/pac";
import { updatePacScheduleSchema } from "@/lib/validations/pac";

function serializeSchedule(record: {
    id: string;
    assetKey: string;
    assetTicker: string;
    amountEur: number;
    cadence: string;
    timingConfig: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        ...record,
        timingConfig: parsePacTimingConfig(record.timingConfig),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;
        const rawData = await req.json();
        const parsed = updatePacScheduleSchema.safeParse(rawData);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Dati PAC non validi" },
                { status: 400 },
            );
        }

        const existing = await prisma.assetPacSchedule.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Regola PAC non trovata" }, { status: 404 });
        }

        const data = parsed.data;
        const schedule = await prisma.assetPacSchedule.update({
            where: { id },
            data: {
                ...(data.assetKey ? { assetKey: data.assetKey } : {}),
                ...(data.assetTicker ? { assetTicker: data.assetTicker.toUpperCase() } : {}),
                ...(data.amountEur !== undefined ? { amountEur: data.amountEur } : {}),
                ...(data.cadence ? { cadence: data.cadence } : {}),
                ...(data.timingConfig ? { timingConfig: stringifyPacTimingConfig(data.timingConfig) } : {}),
                ...(data.active !== undefined ? { active: data.active } : {}),
            },
        });

        return NextResponse.json({ schedule: serializeSchedule(schedule) });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to update PAC schedule:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;

        const existing = await prisma.assetPacSchedule.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Regola PAC non trovata" }, { status: 404 });
        }

        await prisma.assetPacSchedule.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to delete PAC schedule:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
