import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

function stripUserFields<T extends { userId: unknown }>(record: T): Omit<T, "userId"> {
    const rest = { ...record };
    delete (rest as { userId?: unknown }).userId;
    return rest;
}

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();

        const [
            preferences,
            assets,
            savingsGoals,
            budgetTransactions,
            dividends,
            pacSchedules,
            pacExecutions,
            pensionAccruals,
        ] = await Promise.all([
            prisma.preference.findUnique({ where: { userId } }),
            prisma.assetRecord.findMany({ where: { userId }, orderBy: { date: "asc" } }),
            prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
            prisma.budgetTransaction.findMany({ where: { userId }, orderBy: { date: "asc" } }),
            prisma.dividendRecord.findMany({ where: { userId }, orderBy: { paymentDate: "asc" } }),
            prisma.assetPacSchedule.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
            prisma.assetPacExecution.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
            prisma.pensionFundAccrual.findMany({ where: { userId }, orderBy: { accrualMonth: "asc" } }),
        ]);

        return NextResponse.json({
            version: 2,
            exportedAt: new Date().toISOString(),
            preferences: preferences ? stripUserFields(preferences) : null,
            assets: assets.map(stripUserFields),
            savingsGoals: savingsGoals.map(stripUserFields),
            budgetTransactions: budgetTransactions.map(stripUserFields),
            dividends: dividends.map(stripUserFields),
            pacSchedules: pacSchedules.map(stripUserFields),
            pacExecutions: pacExecutions.map(stripUserFields),
            pensionAccruals: pensionAccruals.map(stripUserFields),
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to export user data:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
