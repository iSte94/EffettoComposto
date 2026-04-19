import { NextResponse } from "next/server";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";
import { runAssistantTurn } from "@/lib/ai/runtime";
import {
    AI_ATTACHMENT_MAX_FILES,
    AI_ATTACHMENT_MAX_TOTAL_BYTES,
    formatBytes,
    getAiAttachmentKind,
    validateAiAttachmentMeta,
} from "@/lib/ai/attachments";

type ParsedBody = {
    threadId: string | null;
    content: string;
    files: File[];
};

async function parseBody(req: Request): Promise<ParsedBody> {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        const files = formData
            .getAll("attachments")
            .filter((entry): entry is File => entry instanceof File);
        return {
            threadId: typeof formData.get("threadId") === "string" ? String(formData.get("threadId")) : null,
            content: typeof formData.get("content") === "string" ? String(formData.get("content")) : "",
            files,
        };
    }

    const body = await req.json().catch(() => ({}));
    return {
        threadId: typeof body.threadId === "string" ? body.threadId : null,
        content: typeof body.content === "string" ? body.content : "",
        files: [],
    };
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const { threadId, content, files } = await parseBody(req);

        if (!content.trim() && files.length === 0) {
            return NextResponse.json({ error: "Serve testo o almeno un allegato" }, { status: 400 });
        }
        if (files.length > AI_ATTACHMENT_MAX_FILES) {
            return NextResponse.json({
                error: `Puoi caricare al massimo ${AI_ATTACHMENT_MAX_FILES} allegati per messaggio`,
            }, { status: 400 });
        }

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

        const attachments = await Promise.all(files.map(async (file) => {
            const kind = getAiAttachmentKind(file.type);
            if (!kind) {
                throw new Error(`${file.name}: formato non supportato`);
            }
            return {
                kind,
                mimeType: file.type,
                filename: file.name,
                size: file.size,
                data: new Uint8Array(await file.arrayBuffer()),
            };
        }));

        const result = await runAssistantTurn({
            userId,
            threadId,
            channel: "web",
            prompt: content,
            attachments,
            canWrite: true,
        });

        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("POST /api/ai/chat error:", error);
        return NextResponse.json(
            { error: (error as Error).message || "Errore interno" },
            { status: 500 },
        );
    }
}
