"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { AiProvider } from "@/lib/ai/providers";

export interface AiSettingsState {
    provider: AiProvider | null;
    model: string | null;
    hasStoredKey: boolean;
}

const DEFAULT: AiSettingsState = {
    provider: null,
    model: null,
    hasStoredKey: false,
};

export function useAiSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<AiSettingsState>(DEFAULT);
    const [loaded, setLoaded] = useState(false);

    const refresh = useCallback(async () => {
        if (!user) {
            setSettings(DEFAULT);
            setLoaded(true);
            return;
        }

        setLoaded(false);
        try {
            const res = await fetch("/api/ai-settings", { credentials: "include" });
            if (!res.ok) {
                setSettings(DEFAULT);
                return;
            }
            const json = await res.json();
            setSettings({
                provider: json.settings?.provider ?? null,
                model: json.settings?.model ?? null,
                hasStoredKey: !!json.settings?.hasStoredKey,
            });
        } catch {
            setSettings(DEFAULT);
        } finally {
            setLoaded(true);
        }
    }, [user]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const save = useCallback(async (next: {
        provider: AiProvider;
        model: string;
        apiKey?: string;
    }): Promise<void> => {
        const res = await fetch("/api/ai-settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(next),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Errore nel salvataggio lato server");
        }
        await refresh();
    }, [refresh]);

    const clear = useCallback(async (): Promise<void> => {
        const res = await fetch("/api/ai-settings", {
            method: "DELETE",
            credentials: "include",
        });
        if (!res.ok) {
            throw new Error("Errore nella rimozione");
        }
        await refresh();
    }, [refresh]);

    return { settings, save, clear, refresh, loaded };
}
