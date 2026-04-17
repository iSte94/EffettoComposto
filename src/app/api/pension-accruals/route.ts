import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const limitParam = Number(req.nextUrl.searchParams.get("limit") || 12);
        const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 12;

        const accruals = await prisma.pensionFundAccrual.findMany({
            where: { userId },
            orderBy: [
                { accrualMonth: "desc" },
                { createdAt: "desc" },
            ],
            take: limit,
        });

        return NextResponse.json({
            accruals: accruals.map((accrual) => ({
                ...accrual,
                createdAt: accrual.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to load pension accruals:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
