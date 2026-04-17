export type AiAttachmentKind = "image" | "pdf";

export interface AiAttachmentDescriptor {
    id?: string;
    kind: AiAttachmentKind;
    mimeType: string;
    filename: string;
    size: number;
    url?: string;
}

export interface AiAttachmentInput {
    kind: AiAttachmentKind;
    mimeType: string;
    filename: string;
    size: number;
    dataUrl: string;
}

export const AI_ATTACHMENT_ACCEPT = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
].join(",");

export const AI_ATTACHMENT_MAX_FILES = 3;
export const AI_ATTACHMENT_MAX_FILE_BYTES = 6 * 1024 * 1024;
export const AI_ATTACHMENT_MAX_TOTAL_BYTES = 12 * 1024 * 1024;
export const AI_ATTACHMENT_MAX_REQUEST_BYTES = 14 * 1024 * 1024;

export function getAiAttachmentKind(mimeType: string): AiAttachmentKind | null {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp" || mimeType === "image/gif") {
        return "image";
    }
    return null;
}

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
}

export function validateAiAttachmentMeta(file: { name?: string; size?: number; type?: string }): string | null {
    const mimeType = file.type ?? "";
    const size = file.size ?? 0;
    const name = file.name?.trim() || "file";

    if (!getAiAttachmentKind(mimeType)) {
        return `${name}: formato non supportato. Usa PNG, JPG, GIF, WebP o PDF.`;
    }
    if (size <= 0) {
        return `${name}: file vuoto o non leggibile.`;
    }
    if (size > AI_ATTACHMENT_MAX_FILE_BYTES) {
        return `${name}: supera il limite di ${formatBytes(AI_ATTACHMENT_MAX_FILE_BYTES)}.`;
    }
    return null;
}
