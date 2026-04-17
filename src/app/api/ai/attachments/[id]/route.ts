import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

interface Ctx { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;

        const attachment = await prisma.assistantAttachment.findFirst({
            where: {
                id,
                message: {
                    thread: { userId },
                },
            },
            select: {
                data: true,
                mimeType: true,
                filename: true,
            },
        });

        if (!attachment) {
            return new Response("Not found", { status: 404 });
        }

        return new Response(attachment.data, {
            status: 200,
            headers: {
                "Content-Type": attachment.mimeType,
                "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`,
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("GET /api/ai/attachments/[id] error:", err);
        return new Response("Errore interno", { status: 500 });
    }
}
