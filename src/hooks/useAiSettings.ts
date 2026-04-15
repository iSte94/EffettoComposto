"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { AiProvider } from "@/lib/ai/providers";

export interface AiSettings {
    provider: AiProvider;
    apiKey: string;
    model: string;
}

const STORAGE_KEY = "ec:ai-settings";
const CHANGE_EVENT = "ec:ai-settings-change";
const DEFAULT: AiSettings = { provider: "gemini", apiKey: "", model: "" };

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

export function useAiSettings() {
    const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const settings = useMemo(() => parse(raw), [raw]);
    const loaded = typeof window !== "undefined";

    const save = useCallback((next: AiSettings) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch { /* noop */ }
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);

    const clear = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch { /* noop */ }
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);

    return { settings, save, clear, loaded };
}
