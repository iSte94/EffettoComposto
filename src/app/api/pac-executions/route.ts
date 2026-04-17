import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const limitParam = Number(req.nextUrl.searchParams.get("limit") || 20);
        const assetKey = req.nextUrl.searchParams.get("assetKey");
        const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;

        const executions = await prisma.assetPacExecution.findMany({
            where: {
                userId,
                ...(assetKey ? { assetKey } : {}),
            },
            orderBy: [
                { executionDate: "desc" },
                { createdAt: "desc" },
            ],
            take: limit,
        });

        return NextResponse.json({
            executions: executions.map((execution) => ({
                ...execution,
                createdAt: execution.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to load PAC executions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
