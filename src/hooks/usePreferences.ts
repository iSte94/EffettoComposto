"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

export interface MortgagePreferences {
    propertyPrice: number;
    downpayment: number;
    purchaseTaxes: number;
    notaryFees: number;
    agencyFees: number;
    netIncome: number;
    person1Name: string;
    person1Income: number;
    person2Name: string;
    person2Income: number;
    existingLoansList: string; // JSON string
    rate: number;
    years: number;
    expectedRent: number;
    maintenanceTaxes: number;
    marketReturn: number;
    vacancyRate: number;
    rentInflation: number;
    extraMaintenance: number;
    careerProgression: string;
}

const DEFAULT_PREFERENCES: MortgagePreferences = {
    propertyPrice: 300000,
    downpayment: 60000,
    purchaseTaxes: 6000,
    notaryFees: 3000,
    agencyFees: 9000,
    netIncome: 4000,
    person1Name: "Persona 1",
    person1Income: 2000,
    person2Name: "Persona 2",
    person2Income: 2000,
    existingLoansList: "[]",
    rate: 3.5,
    years: 30,
    expectedRent: 1200,
    maintenanceTaxes: 300,
    marketReturn: 7,
    vacancyRate: 5,
    rentInflation: 1.5,
    extraMaintenance: 10000,
    careerProgression: "[]",
};

export function usePreferences() {
    const { user, isLoading: isLoadingUser } = useAuth();
    const [preferences, setPreferences] = useState<MortgagePreferences>(DEFAULT_PREFERENCES);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const isFirstLoad = useRef(true);

    // Load preferences when user logs in
    const loadPreferences = useCallback(async () => {
        try {
            const res = await fetch('/api/preferences');
            const data = await res.json();
            if (data.preferences) {
                const p = data.preferences;
                setPreferences({
                    propertyPrice: p.propertyPrice ?? DEFAULT_PREFERENCES.propertyPrice,
                    downpayment: p.downpayment ?? DEFAULT_PREFERENCES.downpayment,
                    purchaseTaxes: p.purchaseTaxes ?? DEFAULT_PREFERENCES.purchaseTaxes,
                    notaryFees: p.notaryFees ?? DEFAULT_PREFERENCES.notaryFees,
                    agencyFees: p.agencyFees ?? DEFAULT_PREFERENCES.agencyFees,
                    netIncome: p.netIncome ?? DEFAULT_PREFERENCES.netIncome,
                    person1Name: p.person1Name ?? DEFAULT_PREFERENCES.person1Name,
                    person1Income: p.person1Income ?? DEFAULT_PREFERENCES.person1Income,
                    person2Name: p.person2Name ?? DEFAULT_PREFERENCES.person2Name,
                    person2Income: p.person2Income ?? DEFAULT_PREFERENCES.person2Income,
                    existingLoansList: p.existingLoansList ?? "[]",
                    rate: p.rate ?? DEFAULT_PREFERENCES.rate,
                    years: p.years ?? DEFAULT_PREFERENCES.years,
                    expectedRent: p.expectedRent ?? DEFAULT_PREFERENCES.expectedRent,
                    maintenanceTaxes: p.maintenanceTaxes ?? DEFAULT_PREFERENCES.maintenanceTaxes,
                    marketReturn: p.marketReturn ?? DEFAULT_PREFERENCES.marketReturn,
                    vacancyRate: p.vacancyRate ?? DEFAULT_PREFERENCES.vacancyRate,
                    rentInflation: p.rentInflation ?? DEFAULT_PREFERENCES.rentInflation,
                    extraMaintenance: p.extraMaintenance ?? DEFAULT_PREFERENCES.extraMaintenance,
                    careerProgression: p.careerProgression ?? "[]",
                });
                toast.success("Preferenze caricate dal tuo account");
            }
            setIsLoaded(true);
        } catch (error) {
            console.error("Errore nel caricamento preferenze:", error);
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (user && !isLoaded) {
            loadPreferences();
        }
        if (!user) {
            setIsLoaded(false);
            isFirstLoad.current = true;
        }
    }, [user, isLoaded, loadPreferences]);

    // Auto-save with debounce
    useEffect(() => {
        if (!user || isLoadingUser) return;
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSaving(true);
            try {
                await fetch('/api/preferences', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(preferences),
                });
            } catch (error) {
                console.error("Network error during auto-save:", error);
            } finally {
                setIsSaving(false);
            }
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [preferences, user, isLoadingUser]);

    const updatePreference = useCallback(<K extends keyof MortgagePreferences>(
        key: K, value: MortgagePreferences[K]
    ) => {
        setPreferences(prev => ({ ...prev, [key]: value }));
    }, []);

    const updatePreferences = useCallback((updates: Partial<MortgagePreferences>) => {
        setPreferences(prev => ({ ...prev, ...updates }));
    }, []);

    return {
        preferences,
        isSaving,
        isLoaded,
        updatePreference,
        updatePreferences,
        loadPreferences,
    };
}
