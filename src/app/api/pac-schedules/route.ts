import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import { parsePacTimingConfig, stringifyPacTimingConfig } from "@/lib/pac";
import { createPacScheduleSchema } from "@/lib/validations/pac";

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
        cadence: record.cadence,
        timingConfig: parsePacTimingConfig(record.timingConfig),
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
    };
}

export async function GET(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const assetKey = req.nextUrl.searchParams.get("assetKey");

        const schedules = await prisma.assetPacSchedule.findMany({
            where: {
                userId,
                ...(assetKey ? { assetKey } : {}),
            },
            orderBy: [
                { active: "desc" },
                { updatedAt: "desc" },
            ],
        });

        return NextResponse.json({
            schedules: schedules.map(serializeSchedule),
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to load PAC schedules:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const rawData = await req.json();
        const parsed = createPacScheduleSchema.safeParse(rawData);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Dati PAC non validi" },
                { status: 400 },
            );
        }

        const data = parsed.data;
        const schedule = await prisma.assetPacSchedule.create({
            data: {
                userId,
                assetKey: data.assetKey,
                assetTicker: data.assetTicker.toUpperCase(),
                amountEur: data.amountEur,
                cadence: data.cadence,
                timingConfig: stringifyPacTimingConfig(data.timingConfig),
                active: data.active ?? true,
            },
        });

        return NextResponse.json({ schedule: serializeSchedule(schedule) });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to create PAC schedule:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
