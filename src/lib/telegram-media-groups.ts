import prisma from "@/lib/prisma";

export interface TelegramQueuedAttachmentInput {
    telegramMessageId: string;
    kind: "image" | "pdf";
    mimeType: string;
    filename: string;
    size: number;
    data: Uint8Array;
    sortOrder: number;
}

export interface TelegramQueuedMediaGroup {
    id: string;
    connectionId: string;
    mediaGroupId: string;
    note: string;
    items: TelegramQueuedAttachmentInput[];
}

const TELEGRAM_MEDIA_GROUP_SETTLE_MS = 3000;
const TELEGRAM_MEDIA_GROUP_RETENTION_MS = 1000 * 60 * 60 * 24;
const TELEGRAM_MEDIA_GROUP_STALE_MS = 1000 * 60 * 60;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function cleanupTelegramMediaGroups(connectionId: string): Promise<void> {
    const now = Date.now();
    await prisma.telegramPendingMediaGroup.deleteMany({
        where: {
            connectionId,
            OR: [
                {
                    status: { in: ["processed", "failed"] },
                    updatedAt: { lt: new Date(now - TELEGRAM_MEDIA_GROUP_RETENTION_MS) },
                },
                {
                    status: "collecting",
                    updatedAt: { lt: new Date(now - TELEGRAM_MEDIA_GROUP_STALE_MS) },
                },
            ],
        },
    });
}

export async function queueTelegramMediaGroupItem(args: {
    connectionId: string;
    mediaGroupId: string;
    note?: string;
    item: TelegramQueuedAttachmentInput;
}): Promise<void> {
    await cleanupTelegramMediaGroups(args.connectionId);

    await prisma.$transaction(async (tx) => {
        const existingGroup = await tx.telegramPendingMediaGroup.findUnique({
            where: {
                connectionId_mediaGroupId: {
                    connectionId: args.connectionId,
                    mediaGroupId: args.mediaGroupId,
                },
            },
            select: {
                id: true,
                note: true,
                status: true,
            },
        });

        if (existingGroup?.status === "processed") {
            return;
        }

        const group = existingGroup ?? await tx.telegramPendingMediaGroup.create({
            data: {
                connectionId: args.connectionId,
                mediaGroupId: args.mediaGroupId,
                note: args.note?.trim() ? args.note.trim().slice(0, 2000) : null,
            },
            select: {
                id: true,
                note: true,
            },
        });

        await tx.telegramPendingMediaItem.upsert({
            where: {
                groupId_telegramMessageId: {
                    groupId: group.id,
                    telegramMessageId: args.item.telegramMessageId,
                },
            },
            update: {},
            create: {
                groupId: group.id,
                telegramMessageId: args.item.telegramMessageId,
                kind: args.item.kind,
                mimeType: args.item.mimeType,
                filename: args.item.filename,
                size: args.item.size,
                data: Buffer.from(args.item.data),
                sortOrder: args.item.sortOrder,
            },
        });

        await tx.telegramPendingMediaGroup.update({
            where: { id: group.id },
            data: {
                ...(args.note?.trim() && !group.note ? { note: args.note.trim().slice(0, 2000) } : {}),
                ...(existingGroup?.status === "processing" ? {} : { status: "collecting" }),
                updatedAt: new Date(),
            },
        });
    });
}

export async function waitForSettledTelegramMediaGroup(args: {
    connectionId: string;
    mediaGroupId: string;
}): Promise<TelegramQueuedMediaGroup | null> {
    await sleep(TELEGRAM_MEDIA_GROUP_SETTLE_MS);

    const group = await prisma.telegramPendingMediaGroup.findUnique({
        where: {
            connectionId_mediaGroupId: {
                connectionId: args.connectionId,
                mediaGroupId: args.mediaGroupId,
            },
        },
        include: {
            items: {
                orderBy: [
                    { sortOrder: "asc" },
                    { createdAt: "asc" },
                ],
            },
        },
    });

    if (!group || group.status !== "collecting") {
        return null;
    }

    if (Date.now() - group.updatedAt.getTime() < TELEGRAM_MEDIA_GROUP_SETTLE_MS) {
        return null;
    }

    const claimed = await prisma.telegramPendingMediaGroup.updateMany({
        where: {
            id: group.id,
            status: "collecting",
            updatedAt: group.updatedAt,
        },
        data: {
            status: "processing",
        },
    });

    if (claimed.count === 0) {
        return null;
    }

    return {
        id: group.id,
        connectionId: group.connectionId,
        mediaGroupId: group.mediaGroupId,
        note: group.note ?? "",
        items: group.items.map((item) => ({
            telegramMessageId: item.telegramMessageId,
            kind: item.kind as "image" | "pdf",
            mimeType: item.mimeType,
            filename: item.filename,
            size: item.size,
            data: new Uint8Array(item.data),
            sortOrder: item.sortOrder,
        })),
    };
}

export async function markTelegramMediaGroupProcessed(groupId: string): Promise<void> {
    await prisma.telegramPendingMediaGroup.update({
        where: { id: groupId },
        data: {
            status: "processed",
            processedAt: new Date(),
        },
    });
}

export async function markTelegramMediaGroupFailed(groupId: string): Promise<void> {
    await prisma.telegramPendingMediaGroup.update({
        where: { id: groupId },
        data: {
            status: "failed",
            processedAt: new Date(),
        },
    });
}
