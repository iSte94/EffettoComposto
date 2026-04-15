"use client";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { AiProvider } from "@/lib/ai/providers";

export interface AiSettings {
    provider: AiProvider;
    apiKey: string;
    model: string;
    rememberOnAccount: boolean;
}

const STORAGE_KEY = "ec:ai-settings";
const CHANGE_EVENT = "ec:ai-settings-change";
const DEFAULT: AiSettings = { provider: "gemini", apiKey: "", model: "", rememberOnAccount: false };

function subscribe(cb: () => void) {
    window.addEventListener("storage", cb);
    window.addEventListener(CHANGE_EVENT, cb);
    return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener(CHANGE_EVENT, cb);
    };
}

function getSnapshot(): string {
    try {
        return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
        return "";
    }
}

function getServerSnapshot(): string {
    return "";
}

function parse(raw: string): AiSettings {
    if (!raw) return DEFAULT;
    try {
        return { ...DEFAULT, ...JSON.parse(raw) };
    } catch {
        return DEFAULT;
    }
}

function writeLocal(next: AiSettings) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* noop */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

function wipeLocal() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch { /* noop */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useAiSettings() {
    const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const settings = useMemo(() => parse(raw), [raw]);
    const loaded = typeof window !== "undefined";
    const { user } = useAuth();
    const syncedUserRef = useRef<string | null>(null);

    // Su login: se l'utente ha una chiave salvata lato server, idratala in locale.
    useEffect(() => {
        if (!user || syncedUserRef.current === user.username) return;
        syncedUserRef.current = user.username;
        (async () => {
            try {
                const res = await fetch("/api/ai-settings");
                if (!res.ok) return;
                const json = await res.json();
                if (json.settings) {
                    writeLocal({
                        provider: json.settings.provider,
                        apiKey: json.settings.apiKey,
                        model: json.settings.model,
                        rememberOnAccount: true,
                    });
                }
            } catch { /* noop */ }
        })();
    }, [user]);

    // Su logout: resetta la sentinella di sync.
    useEffect(() => {
        if (!user) syncedUserRef.current = null;
    }, [user]);

    const save = useCallback(async (next: AiSettings): Promise<void> => {
        writeLocal(next);
        if (next.rememberOnAccount) {
            const res = await fetch("/api/ai-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: next.provider,
                    apiKey: next.apiKey,
                    model: next.model,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Errore nel salvataggio lato server");
            }
        } else {
            // Se c'era una chiave sul server, rimuovila.
            await fetch("/api/ai-settings", { method: "DELETE" }).catch(() => {});
        }
    }, []);

    const clear = useCallback(async (): Promise<void> => {
        wipeLocal();
        await fetch("/api/ai-settings", { method: "DELETE" }).catch(() => {});
    }, []);

    return { settings, save, clear, loaded };
}
