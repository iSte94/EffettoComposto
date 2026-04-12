"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import type {
    BudgetCategory,
    BudgetTransaction,
    BudgetSettings,
    BudgetViewMode,
} from "@/types/budget";

const LOCAL_CATEGORIES_KEY = "effetto-composto:budget-categories";
const LOCAL_SETTINGS_KEY = "effetto-composto:budget-settings";
const LOCAL_TRANSACTIONS_KEY = "effetto-composto:budget-transactions";

export const DEFAULT_CATEGORIES: BudgetCategory[] = [
    { id: "cat-spesa", name: "Spesa", limit: 400, color: "#10b981", keywords: ["supermercato", "conad", "esselunga", "coop", "lidl", "carrefour", "pam"] },
    { id: "cat-utenze", name: "Utenze", limit: 200, color: "#3b82f6", keywords: ["bolletta", "enel", "eni", "a2a", "hera", "tim", "vodafone", "fastweb", "wind"] },
    { id: "cat-trasporti", name: "Trasporti", limit: 150, color: "#f59e0b", keywords: ["carburante", "benzina", "esso", "q8", "atm", "trenitalia", "italo"] },
    { id: "cat-ristorazione", name: "Ristorazione", limit: 100, color: "#ef4444", keywords: ["ristorante", "bar", "pizzeria", "just eat", "deliveroo", "glovo"] },
    { id: "cat-shopping", name: "Shopping Online", limit: 100, color: "#a855f7", keywords: ["amazon", "paypal", "zalando", "ebay"] },
    { id: "cat-assicurazione", name: "Assicurazione", limit: 100, color: "#6366f1", keywords: ["assicurazione", "polizza"] },
    { id: "cat-abbonamenti", name: "Abbonamenti", limit: 50, color: "#ec4899", keywords: ["netflix", "spotify", "disney", "prime", "youtube", "icloud"] },
    { id: "cat-altro", name: "Altro", limit: 300, color: "#64748b", keywords: [] },
];

function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}

export function useBudget() {
    const { user, isLoading: isLoadingUser } = useAuth();
    const [categories, setCategories] = useState<BudgetCategory[]>(DEFAULT_CATEGORIES);
    const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
    const [settings, setSettings] = useState<BudgetSettings>({ viewMode: "avg" });
    const [isLoaded, setIsLoaded] = useState(false);
    const [isSavingCategories, setIsSavingCategories] = useState(false);
    const isFirstCategoriesSave = useRef(true);
    const isFirstSettingsSave = useRef(true);

    // ----- Load initial -----
    const load = useCallback(async () => {
        if (!user) {
            if (typeof window !== "undefined") {
                const catsRaw = window.localStorage.getItem(LOCAL_CATEGORIES_KEY);
                const setRaw = window.localStorage.getItem(LOCAL_SETTINGS_KEY);
                const txRaw = window.localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
                setCategories(safeParseJSON<BudgetCategory[]>(catsRaw, DEFAULT_CATEGORIES));
                setSettings(safeParseJSON<BudgetSettings>(setRaw, { viewMode: "avg" }));
                setTransactions(safeParseJSON<BudgetTransaction[]>(txRaw, []));
            }
            setIsLoaded(true);
            return;
        }

        try {
            const [catsRes, txRes, prefRes] = await Promise.all([
                fetch('/api/budget/categories'),
                fetch('/api/budget/transactions'),
                fetch('/api/preferences'),
            ]);
            const catsData = await catsRes.json();
            const txData = await txRes.json();
            const prefData = await prefRes.json();

            const loadedCats = safeParseJSON<BudgetCategory[]>(catsData.categories, []);
            setCategories(loadedCats.length > 0 ? loadedCats : DEFAULT_CATEGORIES);
            setTransactions(Array.isArray(txData.transactions) ? txData.transactions : []);

            const rawSettings = prefData?.preferences?.budgetSettings;
            setSettings(safeParseJSON<BudgetSettings>(rawSettings, { viewMode: "avg" }));
        } catch (err) {
            console.error("Errore caricamento budget:", err);
            setCategories(DEFAULT_CATEGORIES);
        } finally {
            setIsLoaded(true);
        }
    }, [user]);

    useEffect(() => {
        if (isLoadingUser) return;
        setIsLoaded(false);
        isFirstCategoriesSave.current = true;
        isFirstSettingsSave.current = true;
        load();
    }, [user, isLoadingUser, load]);

    // ----- Auto-save categories (debounced) -----
    useEffect(() => {
        if (!isLoaded || isLoadingUser) return;
        if (isFirstCategoriesSave.current) {
            isFirstCategoriesSave.current = false;
            return;
        }

        const t = setTimeout(async () => {
            setIsSavingCategories(true);
            try {
                if (user) {
                    await fetch('/api/budget/categories', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ categories }),
                    });
                } else if (typeof window !== "undefined") {
                    window.localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categories));
                }
            } catch (err) {
                console.error("Errore salvataggio categorie budget:", err);
            } finally {
                setIsSavingCategories(false);
            }
        }, 1200);

        return () => clearTimeout(t);
    }, [categories, user, isLoaded, isLoadingUser]);

    // ----- Auto-save settings (via preferences) -----
    useEffect(() => {
        if (!isLoaded || isLoadingUser) return;
        if (isFirstSettingsSave.current) {
            isFirstSettingsSave.current = false;
            return;
        }
        const t = setTimeout(async () => {
            try {
                if (user) {
                    await fetch('/api/preferences', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ budgetSettings: JSON.stringify(settings) }),
                    });
                } else if (typeof window !== "undefined") {
                    window.localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
                }
            } catch (err) {
                console.error("Errore salvataggio settings budget:", err);
            }
        }, 800);
        return () => clearTimeout(t);
    }, [settings, user, isLoaded, isLoadingUser]);

    // ----- Persist anonymous transactions -----
    useEffect(() => {
        if (!isLoaded || user) return;
        if (typeof window === "undefined") return;
        window.localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(transactions));
    }, [transactions, user, isLoaded]);

    // ----- Actions -----
    const addCategory = useCallback((cat: Omit<BudgetCategory, "id">) => {
        setCategories(prev => [...prev, { ...cat, id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }]);
    }, []);

    const updateCategory = useCallback((id: string, updates: Partial<BudgetCategory>) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }, []);

    const removeCategory = useCallback((id: string) => {
        setCategories(prev => {
            const cat = prev.find(c => c.id === id);
            if (!cat || cat.name === "Altro") return prev;
            return prev.filter(c => c.id !== id);
        });
    }, []);

    const setViewMode = useCallback((mode: BudgetViewMode) => {
        setSettings(prev => ({ ...prev, viewMode: mode }));
    }, []);

    const setCurrentMonth = useCallback((month: string | undefined) => {
        setSettings(prev => ({ ...prev, currentMonth: month }));
    }, []);

    const importTransactions = useCallback(async (newTx: BudgetTransaction[]) => {
        if (newTx.length === 0) return { inserted: 0, skipped: 0 };

        if (user) {
            try {
                const res = await fetch('/api/budget/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transactions: newTx.map(t => ({
                            date: t.date,
                            description: t.description,
                            amount: t.amount,
                            category: t.category,
                            hash: t.hash,
                        })),
                    }),
                });
                const data = await res.json();
                // Refresh
                const refreshed = await fetch('/api/budget/transactions');
                const refreshedData = await refreshed.json();
                setTransactions(refreshedData.transactions || []);
                return { inserted: data.inserted || 0, skipped: data.skipped || 0 };
            } catch (err) {
                console.error("Errore import transazioni:", err);
                toast.error("Errore durante l'import");
                return { inserted: 0, skipped: 0 };
            }
        } else {
            // Anonymous: dedupe in-memory
            const existing = new Set(transactions.map(t => t.hash));
            const fresh = newTx.filter(t => !existing.has(t.hash));
            setTransactions(prev => [...fresh, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
            return { inserted: fresh.length, skipped: newTx.length - fresh.length };
        }
    }, [user, transactions]);

    const updateTransactionCategory = useCallback(async (id: string, category: string) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, category, categoryOverride: true } : t));
        if (user) {
            try {
                await fetch(`/api/budget/transactions/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category }),
                });
            } catch (err) {
                console.error("Errore update transazione:", err);
            }
        }
    }, [user]);

    const deleteTransaction = useCallback(async (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        if (user) {
            try {
                await fetch(`/api/budget/transactions/${id}`, { method: 'DELETE' });
            } catch (err) {
                console.error("Errore delete transazione:", err);
            }
        }
    }, [user]);

    const deleteTransactionsByMonth = useCallback(async (month: "all" | string) => {
        if (user) {
            try {
                await fetch('/api/budget/transactions', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month }),
                });
                const refreshed = await fetch('/api/budget/transactions');
                const data = await refreshed.json();
                setTransactions(data.transactions || []);
            } catch (err) {
                console.error("Errore delete mese:", err);
            }
        } else {
            if (month === "all") setTransactions([]);
            else setTransactions(prev => prev.filter(t => !t.date.startsWith(month)));
        }
    }, [user]);

    // Re-applica le regole correnti (client-side) a tutte le transazioni non override
    const reapplyCategoryRules = useCallback(async (categorizer: (desc: string) => string) => {
        const mapping: { id: string; category: string }[] = [];
        const updated = transactions.map(t => {
            if (t.categoryOverride) return t;
            const newCat = categorizer(t.description);
            if (newCat !== t.category) {
                mapping.push({ id: t.id, category: newCat });
                return { ...t, category: newCat };
            }
            return t;
        });

        if (mapping.length === 0) {
            toast.info("Nessuna transazione da ricategorizzare");
            return;
        }

        setTransactions(updated);

        if (user) {
            try {
                const res = await fetch('/api/budget/transactions/reapply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mapping }),
                });
                const data = await res.json();
                toast.success(`${data.updated || mapping.length} transazioni aggiornate`);
            } catch (err) {
                console.error("Errore reapply:", err);
                toast.error("Errore durante il ri-applica");
            }
        } else {
            toast.success(`${mapping.length} transazioni aggiornate`);
        }
    }, [transactions, user]);

    return {
        categories,
        transactions,
        settings,
        isLoaded,
        isSavingCategories,
        addCategory,
        updateCategory,
        removeCategory,
        setViewMode,
        setCurrentMonth,
        importTransactions,
        updateTransactionCategory,
        deleteTransaction,
        deleteTransactionsByMonth,
        reapplyCategoryRules,
    };
}
