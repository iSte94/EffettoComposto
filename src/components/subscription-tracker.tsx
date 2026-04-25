"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Repeat, CreditCard, Sparkles } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { useAuth } from "@/contexts/auth-context";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
    computeSubscriptionOpportunityCost,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT,
} from "@/lib/finance/subscription-opportunity";

interface Subscription {
    id: string;
    name: string;
    amount: number;
    frequency: "mensile" | "annuale";
}

const COMMON_SUBS: Omit<Subscription, "id">[] = [
    { name: "Netflix", amount: 13.99, frequency: "mensile" },
    { name: "Spotify", amount: 10.99, frequency: "mensile" },
    { name: "Amazon Prime", amount: 49.9, frequency: "annuale" },
    { name: "Disney+", amount: 8.99, frequency: "mensile" },
    { name: "YouTube Premium", amount: 11.99, frequency: "mensile" },
    { name: "Apple iCloud", amount: 2.99, frequency: "mensile" },
    { name: "Palestra", amount: 39.9, frequency: "mensile" },
    { name: "Assicurazione Auto", amount: 600, frequency: "annuale" },
];

export function SubscriptionTracker() {
    const { user } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [showPresets, setShowPresets] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Load subscriptions from preferences on mount
    useEffect(() => {
        if (!user) { setLoaded(true); return; }
        (async () => {
            try {
                const res = await fetch("/api/preferences");
                const data = await res.json();
                if (data.preferences?.subscriptionsList) {
                    const parsed = JSON.parse(data.preferences.subscriptionsList);
                    if (Array.isArray(parsed)) setSubscriptions(parsed);
                }
            } catch (e) {
                console.error("Failed to load subscriptions", e);
            } finally {
                setLoaded(true);
            }
        })();
    }, [user]);

    // Save subscriptions to preferences (debounced)
    const saveSubscriptions = useCallback(async (subs: Subscription[]) => {
        if (!user) return;
        try {
            await fetch("/api/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subscriptionsList: JSON.stringify(subs) }),
            });
        } catch (e) {
            console.error("Failed to save subscriptions", e);
        }
    }, [user]);

    const addSub = (sub: Omit<Subscription, "id">) => {
        setSubscriptions((prev) => {
            const updated = [...prev, { ...sub, id: Date.now().toString() }];
            saveSubscriptions(updated);
            return updated;
        });
    };

    const removeSub = (id: string) => {
        setSubscriptions((prev) => {
            const updated = prev.filter((s) => s.id !== id);
            saveSubscriptions(updated);
            return updated;
        });
    };

    const updateSub = (id: string, updates: Partial<Subscription>) => {
        setSubscriptions((prev) => {
            const updated = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
            saveSubscriptions(updated);
            return updated;
        });
    };

    const totals = useMemo(() => {
        let monthly = 0;
        for (const subscription of subscriptions) {
            monthly += subscription.frequency === "annuale" ? subscription.amount / 12 : subscription.amount;
        }
        return { monthly, annual: monthly * 12 };
    }, [subscriptions]);

    // Costo opportunita' composto: traduce la spesa mensile aggregata nel
    // capitale (in potere d'acquisto odierno) che avresti accumulato
    // investendo la stessa cifra al rendimento reale di default per
    // l'orizzonte di default. E' il "latte factor" sotto il claim
    // "Effetto Composto" - chiude il cerchio fra abbonamenti e FIRE.
    const opportunityCost = useMemo(
        () => computeSubscriptionOpportunityCost({ monthlyAmount: totals.monthly }),
        [totals.monthly],
    );

    if (!loaded) return (
        <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
            <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-5 w-44 rounded-lg" />
                    </div>
                    <Skeleton className="h-10 w-24 rounded-xl" />
                </div>
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-14 rounded-2xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-3 border-t border-border/70 pt-3 sm:grid-cols-2">
                    <Skeleton className="h-20 rounded-2xl" />
                    <Skeleton className="h-20 rounded-2xl" />
                </div>
            </CardContent>
        </Card>
    );

    return (
        <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
            <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                        <Repeat className="w-5 h-5 text-rose-500" /> Abbonamenti Ricorrenti
                    </h3>
                    <Button
                        variant="outline"
                        size="sm"
                        className="min-h-10 rounded-xl text-xs sm:self-auto"
                        onClick={() => setShowPresets((prev) => !prev)}
                    >
                        <Plus className="w-3 h-3 mr-1" /> Aggiungi
                    </Button>
                </div>

                {showPresets && (
                    <div className="grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2 duration-200 sm:grid-cols-2 xl:grid-cols-4">
                        {COMMON_SUBS.filter((preset) => !subscriptions.some((sub) => sub.name === preset.name)).map((preset) => (
                            <button
                                key={preset.name}
                                type="button"
                                onClick={() => {
                                    addSub(preset);
                                    setShowPresets(false);
                                }}
                                className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-left text-xs transition-all hover:border-rose-300 hover:bg-rose-50/70 dark:hover:bg-rose-950/20"
                            >
                                <div className="font-bold text-foreground">{preset.name}</div>
                                <div className="mt-1 text-muted-foreground">
                                    {formatEuro(preset.amount)}/{preset.frequency === "annuale" ? "anno" : "mese"}
                                </div>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                addSub({ name: "", amount: 0, frequency: "mensile" });
                                setShowPresets(false);
                            }}
                            className="rounded-2xl border-2 border-dashed border-border/80 bg-muted/15 p-3 text-left text-xs transition-all hover:border-rose-300 hover:bg-rose-50/50 dark:hover:bg-rose-950/20"
                        >
                            <div className="font-bold text-muted-foreground">Personalizzato...</div>
                        </button>
                    </div>
                )}

                {subscriptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-8 text-center text-muted-foreground">
                        <CreditCard className="mx-auto mb-2 h-10 w-10 opacity-50" />
                        <p className="text-sm">Nessun abbonamento tracciato.</p>
                        <p className="text-xs">Aggiungi i tuoi abbonamenti per vedere quanto spendi ogni mese.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {subscriptions.map((sub) => (
                                <div
                                    key={sub.id}
                                    className="grid gap-3 rounded-2xl border border-border/70 bg-background/55 p-3 transition-all hover:shadow-sm sm:grid-cols-[minmax(0,1fr)_112px_120px_auto] sm:items-center"
                                >
                                    <div className="min-w-0">
                                        <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:hidden">
                                            Nome
                                        </Label>
                                        <Input
                                            value={sub.name}
                                            onChange={(e) => updateSub(sub.id, { name: e.target.value })}
                                            placeholder="Nome abbonamento"
                                            className="min-h-10 border-none bg-transparent p-0 text-sm font-bold text-foreground shadow-none focus-visible:ring-0"
                                        />
                                    </div>
                                    <div className="sm:w-28">
                                        <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:hidden">
                                            Importo
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={sub.amount}
                                            onChange={(e) => updateSub(sub.id, { amount: Number(e.target.value) })}
                                            className="min-h-10 rounded-xl border-border/70 bg-background/70 text-right text-sm font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:hidden">
                                            Frequenza
                                        </Label>
                                        <select
                                            value={sub.frequency}
                                            onChange={(e) => updateSub(sub.id, { frequency: e.target.value as "mensile" | "annuale" })}
                                            className="min-h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-xs font-bold text-foreground outline-none transition-colors focus:border-ring"
                                        >
                                            <option value="mensile">Mensile</option>
                                            <option value="annuale">Annuale</option>
                                        </select>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 justify-self-end text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                                        onClick={() => removeSub(sub.id)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-3 border-t border-border/70 pt-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-center dark:border-rose-900 dark:bg-rose-950/30">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Costo Mensile</Label>
                                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatEuro(totals.monthly)}</div>
                            </div>
                            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-center dark:border-rose-900 dark:bg-rose-950/30">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Costo Annuale</Label>
                                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatEuro(totals.annual)}</div>
                            </div>
                        </div>

                        {totals.monthly > 0 && (
                            <div
                                className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/70 p-4 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/20"
                                title={`Investendo ${formatEuro(totals.monthly)}/mese al ${DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT}% reale annuo per ${DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS} anni accumuleresti ${formatEuro(opportunityCost.futureValueReal)} in potere d'acquisto odierno (di cui ${formatEuro(opportunityCost.compoundGain)} di soli interessi composti).`}
                            >
                                <div className="mb-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                    <Sparkles className="h-3 w-3" /> Costo Opportunita&apos; a {DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS} Anni
                                    <InfoTooltip iconClassName="w-3 h-3">
                                        Quanto avresti accumulato investendo la stessa cifra mensile al {DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT}% reale annuo per {DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS} anni, capitalizzazione mensile. Valore espresso in potere d&apos;acquisto odierno (al netto dell&apos;inflazione), confrontabile direttamente con la spesa attuale. E&apos; il classico &quot;latte factor&quot;: piccoli costi ricorrenti diventano grandi capitali grazie all&apos;effetto composto.
                                    </InfoTooltip>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                                        {formatEuro(opportunityCost.futureValueReal)}
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-emerald-600/80 dark:text-emerald-400/70">
                                        in euro odierni, al {DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT}% reale per {DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS} anni
                                    </div>
                                    {opportunityCost.compoundGain > 0 && (
                                        <div className="mt-1 text-[10px] text-muted-foreground">
                                            di cui {formatEuro(opportunityCost.compoundGain)} di soli interessi composti
                                            <span className="mx-1">·</span>
                                            speso in abbonamenti: {formatEuro(opportunityCost.totalContributed)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
