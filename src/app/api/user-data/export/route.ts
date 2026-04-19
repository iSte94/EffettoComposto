import { NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import { buildUserExportData } from "@/lib/user-data";

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();
        return NextResponse.json(await buildUserExportData(userId, false));
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to export user data:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
