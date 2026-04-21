"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { addFinancialDataChangedListener } from "@/lib/client-data-events";
import type { PlannedFinancialEvent } from "@/types";

interface UsePlannedEventsResult {
    events: PlannedFinancialEvent[];
    loading: boolean;
    refresh: (showLoading?: boolean) => Promise<void>;
    setEvents: Dispatch<SetStateAction<PlannedFinancialEvent[]>>;
}

export function usePlannedEvents(user: { username: string } | null): UsePlannedEventsResult {
    const [events, setEvents] = useState<PlannedFinancialEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async (showLoading = true) => {
        if (!user) {
            setEvents([]);
            setLoading(false);
            return;
        }

        if (showLoading) setLoading(true);
        try {
            const res = await fetch("/api/planned-events", {
                cache: "no-store",
                credentials: "same-origin",
            });
            if (!res.ok) {
                throw new Error(`Planned events request failed with status ${res.status}`);
            }

            const data = await res.json();
            setEvents(Array.isArray(data.events) ? data.events : []);
        } catch (error) {
            console.error("Errore nel caricamento eventi futuri:", error);
            if (showLoading) {
                toast.error("Impossibile caricare gli eventi futuri");
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        if (!user) return;

        return addFinancialDataChangedListener((detail) => {
            if (detail.source === "planned-events-manager") return;
            void refresh(false);
        });
    }, [refresh, user]);

    return {
        events,
        loading,
        refresh,
        setEvents,
    };
}
