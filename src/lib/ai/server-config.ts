import prisma from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import type { AiProvider } from "@/lib/ai/providers";
import type { ServerAiConfigStatus } from "@/types";

export interface StoredAiSettings {
    provider: AiProvider;
    model: string;
    apiKey: string;
}

export async function getStoredAiSettings(userId: string): Promise<StoredAiSettings | null> {
    const pref = await prisma.preference.findUnique({
        where: { userId },
        select: {
            aiProvider: true,
            aiModel: true,
            aiApiKeyEnc: true,
        },
    });

    if (!pref?.aiProvider || !pref.aiModel || !pref.aiApiKeyEnc) {
        return null;
    }

    return {
        provider: pref.aiProvider as AiProvider,
        model: pref.aiModel,
        apiKey: decrypt(pref.aiApiKeyEnc),
    };
}

export async function getStoredAiConfigStatus(userId: string): Promise<ServerAiConfigStatus> {
    const pref = await prisma.preference.findUnique({
        where: { userId },
        select: {
            aiProvider: true,
            aiModel: true,
            aiApiKeyEnc: true,
        },
    });

    return {
        provider: (pref?.aiProvider as AiProvider | null) ?? null,
        model: pref?.aiModel ?? null,
        hasStoredKey: !!pref?.aiApiKeyEnc,
    };
}

export async function saveStoredAiSettings(args: {
    userId: string;
    provider: AiProvider;
    model: string;
    apiKey?: string;
}): Promise<void> {
    const existing = await prisma.preference.findUnique({
        where: { userId: args.userId },
        select: { aiApiKeyEnc: true },
    });

    const encryptedKey = args.apiKey?.trim()
        ? encrypt(args.apiKey.trim())
        : existing?.aiApiKeyEnc ?? null;

    if (!encryptedKey) {
        throw new Error("Serve una API key da salvare sul server");
    }

    await prisma.preference.upsert({
        where: { userId: args.userId },
        update: {
            aiRememberKeys: true,
            aiProvider: args.provider,
            aiModel: args.model,
            aiApiKeyEnc: encryptedKey,
        },
        create: {
            userId: args.userId,
            aiRememberKeys: true,
            aiProvider: args.provider,
            aiModel: args.model,
            aiApiKeyEnc: encryptedKey,
        },
    });
}

export async function clearStoredAiSettings(userId: string): Promise<void> {
    await prisma.preference.updateMany({
        where: { userId },
        data: {
            aiRememberKeys: false,
            aiProvider: null,
            aiModel: null,
            aiApiKeyEnc: null,
        },
    });
}
