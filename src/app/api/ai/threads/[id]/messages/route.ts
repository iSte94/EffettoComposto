import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import {
    AI_ATTACHMENT_MAX_FILES,
    AI_ATTACHMENT_MAX_TOTAL_BYTES,
    formatBytes,
    getAiAttachmentKind,
    validateAiAttachmentMeta,
} from "@/lib/ai/attachments";

interface Ctx { params: Promise<{ id: string }> }

type ParsedMessageBody = {
    role: "user" | "assistant" | null;
    content: string | null;
    toolTrace: unknown[] | null;
    files: File[];
};

async function parseBody(req: Request): Promise<ParsedMessageBody> {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const roleValue = formData.get("role");
        const contentValue = formData.get("content");
        const toolTraceRaw = formData.get("toolTrace");
        const files = formData
            .getAll("attachments")
            .filter((entry): entry is File => entry instanceof File);

        let toolTrace: unknown[] | null = null;
        if (typeof toolTraceRaw === "string" && toolTraceRaw.trim()) {
            try {
                const parsed = JSON.parse(toolTraceRaw);
                toolTrace = Array.isArray(parsed) ? parsed : null;
            } catch {
                toolTrace = null;
            }
        }

        return {
            role: roleValue === "assistant" ? "assistant" : roleValue === "user" ? "user" : null,
            content: typeof contentValue === "string" ? contentValue : "",
            toolTrace,
            files,
        };
    }

    const body = await req.json().catch(() => ({}));
    return {
        role: body.role === "assistant" ? "assistant" : body.role === "user" ? "user" : null,
        content: typeof body.content === "string" ? body.content : null,
        toolTrace: Array.isArray(body.toolTrace) ? body.toolTrace : null,
        files: [],
    };
}

export async function POST(req: Request, { params }: Ctx) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id: threadId } = await params;
        const { role, content, toolTrace, files } = await parseBody(req);

        if (!role || content === null) {
            return NextResponse.json({ error: "role obbligatorio" }, { status: 400 });
        }
        if (!content.trim() && files.length === 0) {
            return NextResponse.json({ error: "Serve testo o almeno un allegato" }, { status: 400 });
        }
        if (files.length > AI_ATTACHMENT_MAX_FILES) {
            return NextResponse.json({
                error: `Puoi caricare al massimo ${AI_ATTACHMENT_MAX_FILES} allegati per messaggio`,
            }, { status: 400 });
        }

        const thread = await prisma.assistantThread.findFirst({
            where: { id: threadId, userId },
            select: { id: true, messages: { select: { id: true }, take: 1 } },
        });
        if (!thread) return NextResponse.json({ error: "Thread non trovato" }, { status: 404 });

        let totalAttachmentBytes = 0;
        for (const file of files) {
            const validationError = validateAiAttachmentMeta(file);
            if (validationError) {
                return NextResponse.json({ error: validationError }, { status: 400 });
            }
            totalAttachmentBytes += file.size;
        }
        if (totalAttachmentBytes > AI_ATTACHMENT_MAX_TOTAL_BYTES) {
            return NextResponse.json({
                error: `Gli allegati superano ${formatBytes(AI_ATTACHMENT_MAX_TOTAL_BYTES)} complessivi`,
            }, { status: 400 });
        }

        const attachmentPayload = [];
        for (const file of files) {
            const kind = getAiAttachmentKind(file.type);
            if (!kind) {
                return NextResponse.json({ error: `${file.name}: formato non supportato` }, { status: 400 });
            }
            const bytes = new Uint8Array(await file.arrayBuffer());
            attachmentPayload.push({
                kind,
                mimeType: file.type,
                filename: file.name.slice(0, 180) || `${kind}.${kind === "pdf" ? "pdf" : "bin"}`,
                size: file.size,
                data: bytes,
            });
        }

        const created = await prisma.assistantMessage.create({
            data: {
                threadId,
                role,
                content: content.slice(0, 200_000),
                toolTrace: toolTrace ? JSON.stringify(toolTrace).slice(0, 500_000) : null,
                attachments: attachmentPayload.length > 0
                    ? {
                        create: attachmentPayload,
                    }
                    : undefined,
            },
            include: {
                attachments: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        const updateData: { updatedAt: Date; title?: string } = { updatedAt: new Date() };
        // Se e' il primo messaggio user, usa il contenuto come titolo auto-generato
        if (role === "user" && thread.messages.length === 0) {
            const fallbackTitle = created.attachments[0]?.filename || `${created.attachments.length} allegati`;
            updateData.title = content.slice(0, 60).replace(/\s+/g, " ").trim() || fallbackTitle || "Nuova conversazione";
        }
        await prisma.assistantThread.update({
            where: { id: threadId },
            data: updateData,
        });

        return NextResponse.json({
            message: {
                id: created.id,
                role: created.role,
                content: created.content,
                toolTrace: created.toolTrace ? JSON.parse(created.toolTrace) : null,
                attachments: created.attachments.map((attachment) => ({
                    id: attachment.id,
                    kind: attachment.kind,
                    mimeType: attachment.mimeType,
                    filename: attachment.filename,
                    size: attachment.size,
                    url: `/api/ai/attachments/${attachment.id}`,
                })),
                createdAt: created.createdAt.toISOString(),
            },
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("POST /api/ai/threads/[id]/messages error:", err);
        return NextResponse.json({ error: "Errore interno" }, { status: 500 });
    }
}
