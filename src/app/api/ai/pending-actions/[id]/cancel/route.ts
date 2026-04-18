import { NextResponse } from "next/server";
import { cancelPendingAction } from "@/lib/ai/pending-actions";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await ctx.params;
        const result = await cancelPendingAction({
            actionId: id,
            userId,
        });
        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        return NextResponse.json({ error: (error as Error).message || "Errore interno" }, { status: 400 });
    }
}
