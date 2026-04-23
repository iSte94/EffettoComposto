"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { broadcastFinancialDataChanged } from "@/lib/client-data-events";

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
    salaryCalculationHistory: string;
    loanCalculatorSavedScenarios: string;
    expectedMonthlyExpenses: number;
    fireWithdrawalRate: number;
    fireExpectedReturn: number;
}

const LOCAL_PREFERENCES_KEY = "effetto-composto:career-preferences";

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
    salaryCalculationHistory: "[]",
    loanCalculatorSavedScenarios: "[]",
    expectedMonthlyExpenses: 2500,
    fireWithdrawalRate: 3.25,
    fireExpectedReturn: 6,
};

export function usePreferences() {
    const { user, isLoading: isLoadingUser } = useAuth();
    const [preferences, setPreferences] = useState<MortgagePreferences>(DEFAULT_PREFERENCES);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const isFirstLoad = useRef(true);

    const normalizePreferences = useCallback((raw: Partial<MortgagePreferences> | null | undefined): MortgagePreferences => ({
        propertyPrice: raw?.propertyPrice ?? DEFAULT_PREFERENCES.propertyPrice,
        downpayment: raw?.downpayment ?? DEFAULT_PREFERENCES.downpayment,
        purchaseTaxes: raw?.purchaseTaxes ?? DEFAULT_PREFERENCES.purchaseTaxes,
        notaryFees: raw?.notaryFees ?? DEFAULT_PREFERENCES.notaryFees,
        agencyFees: raw?.agencyFees ?? DEFAULT_PREFERENCES.agencyFees,
        netIncome: raw?.netIncome ?? DEFAULT_PREFERENCES.netIncome,
        person1Name: raw?.person1Name ?? DEFAULT_PREFERENCES.person1Name,
        person1Income: raw?.person1Income ?? DEFAULT_PREFERENCES.person1Income,
        person2Name: raw?.person2Name ?? DEFAULT_PREFERENCES.person2Name,
        person2Income: raw?.person2Income ?? DEFAULT_PREFERENCES.person2Income,
        existingLoansList: raw?.existingLoansList ?? DEFAULT_PREFERENCES.existingLoansList,
        rate: raw?.rate ?? DEFAULT_PREFERENCES.rate,
        years: raw?.years ?? DEFAULT_PREFERENCES.years,
        expectedRent: raw?.expectedRent ?? DEFAULT_PREFERENCES.expectedRent,
        maintenanceTaxes: raw?.maintenanceTaxes ?? DEFAULT_PREFERENCES.maintenanceTaxes,
        marketReturn: raw?.marketReturn ?? DEFAULT_PREFERENCES.marketReturn,
        vacancyRate: raw?.vacancyRate ?? DEFAULT_PREFERENCES.vacancyRate,
        rentInflation: raw?.rentInflation ?? DEFAULT_PREFERENCES.rentInflation,
        extraMaintenance: raw?.extraMaintenance ?? DEFAULT_PREFERENCES.extraMaintenance,
        careerProgression: raw?.careerProgression ?? DEFAULT_PREFERENCES.careerProgression,
        salaryCalculationHistory: raw?.salaryCalculationHistory ?? DEFAULT_PREFERENCES.salaryCalculationHistory,
        loanCalculatorSavedScenarios: raw?.loanCalculatorSavedScenarios ?? DEFAULT_PREFERENCES.loanCalculatorSavedScenarios,
        expectedMonthlyExpenses: raw?.expectedMonthlyExpenses ?? DEFAULT_PREFERENCES.expectedMonthlyExpenses,
        fireWithdrawalRate: raw?.fireWithdrawalRate ?? DEFAULT_PREFERENCES.fireWithdrawalRate,
        fireExpectedReturn: raw?.fireExpectedReturn ?? DEFAULT_PREFERENCES.fireExpectedReturn,
    }), []);

    // Load preferences when user logs in
    const loadPreferences = useCallback(async () => {
        if (!user) {
            try {
                if (typeof window === "undefined") {
                    setPreferences(DEFAULT_PREFERENCES);
                } else {
                    const stored = window.localStorage.getItem(LOCAL_PREFERENCES_KEY);
                    const parsed = stored ? JSON.parse(stored) as Partial<MortgagePreferences> : null;
                    setPreferences(normalizePreferences(parsed));
                }
            } catch (error) {
                console.error("Errore nel caricamento preferenze locali:", error);
                setPreferences(DEFAULT_PREFERENCES);
            } finally {
                setIsLoaded(true);
            }
            return;
        }

        try {
            const res = await fetch('/api/preferences', {
                cache: "no-store",
                credentials: "same-origin",
            });
            if (!res.ok) {
                throw new Error(`Preferences request failed with status ${res.status}`);
            }
            const data = await res.json();
            if (data.preferences) {
                setPreferences(normalizePreferences(data.preferences));
                toast.success("Preferenze caricate dal tuo account");
            } else {
                setPreferences(DEFAULT_PREFERENCES);
            }
            setIsLoaded(true);
        } catch (error) {
            console.error("Errore nel caricamento preferenze:", error);
            toast.error("Impossibile caricare le preferenze del tuo account");
            setIsLoaded(true);
        }
    }, [normalizePreferences, user]);

    useEffect(() => {
        if (isLoadingUser) return;
        if (!isLoaded) {
            loadPreferences();
        }
    }, [user, isLoaded, isLoadingUser, loadPreferences]);

    useEffect(() => {
        if (isLoadingUser) return;
        setPreferences(DEFAULT_PREFERENCES);
        setIsSaving(false);
        setIsLoaded(false);
        isFirstLoad.current = true;
    }, [user, isLoadingUser]);

    // Auto-save with debounce
    useEffect(() => {
        if (isLoadingUser || !isLoaded) return;
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSaving(true);
            try {
                if (user) {
                    const res = await fetch('/api/preferences', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(preferences),
                    });
                    if (res.ok) {
                        broadcastFinancialDataChanged({ scope: "preferences", source: "usePreferences" });
                    }
                } else if (typeof window !== "undefined") {
                    window.localStorage.setItem(LOCAL_PREFERENCES_KEY, JSON.stringify(preferences));
                    broadcastFinancialDataChanged({ scope: "preferences", source: "usePreferences" });
                }
            } catch (error) {
                console.error("Errore durante il salvataggio preferenze:", error);
            } finally {
                setIsSaving(false);
            }
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [preferences, user, isLoaded, isLoadingUser]);

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
