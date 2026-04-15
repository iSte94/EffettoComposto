"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

interface State {
    profile: string;
    loaded: boolean;
}

export function useAiUserProfile() {
    const { user } = useAuth();
    const [state, setState] = useState<State>({ profile: "", loaded: false });
    const fetchedForRef = useRef<string | null>(null);

    useEffect(() => {
        if (!user) {
            fetchedForRef.current = null;
            return;
        }
        if (fetchedForRef.current === user.username) return;
        fetchedForRef.current = user.username;
        (async () => {
            try {
                const res = await fetch("/api/preferences");
                if (!res.ok) {
                    setState({ profile: "", loaded: true });
                    return;
                }
                const json = await res.json();
                const text = json?.preferences?.aiUserProfile ?? "";
                setState({ profile: text, loaded: true });
            } catch {
                setState({ profile: "", loaded: true });
            }
        })();
    }, [user]);

    const save = useCallback(async (next: string): Promise<void> => {
        const res = await fetch("/api/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiUserProfile: next }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Errore nel salvataggio");
        }
        setState({ profile: next, loaded: true });
    }, []);

    return { profile: state.profile, loaded: state.loaded, save };
}
