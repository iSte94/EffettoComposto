"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Repeat, CreditCard } from "lucide-react";
import { formatEuro } from "@/lib/format";

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
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [showPresets, setShowPresets] = useState(false);

    const addSub = (sub: Omit<Subscription, "id">) => {
        setSubscriptions((prev) => [...prev, { ...sub, id: Date.now().toString() }]);
    };

    const removeSub = (id: string) => {
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    };

    const updateSub = (id: string, updates: Partial<Subscription>) => {
        setSubscriptions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const totals = useMemo(() => {
        let monthly = 0;
        for (const subscription of subscriptions) {
            monthly += subscription.frequency === "annuale" ? subscription.amount / 12 : subscription.amount;
        }
        return { monthly, annual: monthly * 12 };
    }, [subscriptions]);

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
                    </>
                )}
            </CardContent>
        </Card>
    );
}
