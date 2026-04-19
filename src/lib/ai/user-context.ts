import prisma from "@/lib/prisma";
import { buildUserExportData } from "@/lib/user-data";

export interface AssistantMemoryEntry {
    id: string;
    category: string;
    fact: string;
    pinned: boolean;
    source: "auto" | "manual";
    createdAt: string;
    updatedAt: string;
}

export async function buildAssistantDataJson(userId: string): Promise<string> {
    const data = await buildUserExportData(userId, true);
    return JSON.stringify(data);
}

export async function loadAssistantMemory(userId: string): Promise<AssistantMemoryEntry[]> {
    const memory = await prisma.assistantMemory.findMany({
        where: { userId },
        orderBy: [
            { pinned: "desc" },
            { updatedAt: "desc" },
        ],
    });

    return memory.map((entry) => ({
        id: entry.id,
        category: entry.category,
        fact: entry.fact,
        pinned: entry.pinned,
        source: entry.source as "auto" | "manual",
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
    }));
}

export async function loadAssistantUserProfile(userId: string): Promise<string> {
    const pref = await prisma.preference.findUnique({
        where: { userId },
        select: { aiUserProfile: true },
    });
    return pref?.aiUserProfile ?? "";
}
