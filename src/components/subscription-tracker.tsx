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
    { name: "Amazon Prime", amount: 49.90, frequency: "annuale" },
    { name: "Disney+", amount: 8.99, frequency: "mensile" },
    { name: "YouTube Premium", amount: 11.99, frequency: "mensile" },
    { name: "Apple iCloud", amount: 2.99, frequency: "mensile" },
    { name: "Palestra", amount: 39.90, frequency: "mensile" },
    { name: "Assicurazione Auto", amount: 600, frequency: "annuale" },
];

export function SubscriptionTracker() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [showPresets, setShowPresets] = useState(false);

    const addSub = (sub: Omit<Subscription, "id">) => {
        setSubscriptions(prev => [...prev, { ...sub, id: Date.now().toString() }]);
    };

    const removeSub = (id: string) => {
        setSubscriptions(prev => prev.filter(s => s.id !== id));
    };

    const updateSub = (id: string, updates: Partial<Subscription>) => {
        setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const totals = useMemo(() => {
        let monthly = 0;
        for (const s of subscriptions) {
            monthly += s.frequency === "annuale" ? s.amount / 12 : s.amount;
        }
        return { monthly, annual: monthly * 12 };
    }, [subscriptions]);

    return (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Repeat className="w-5 h-5 text-rose-500" /> Abbonamenti Ricorrenti
                    </h3>
                    <Button variant="outline" size="sm" className="text-xs rounded-xl" onClick={() => setShowPresets(!showPresets)}>
                        <Plus className="w-3 h-3 mr-1" /> Aggiungi
                    </Button>
                </div>

                {showPresets && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {COMMON_SUBS.filter(cs => !subscriptions.some(s => s.name === cs.name)).map((cs) => (
                            <button key={cs.name} onClick={() => { addSub(cs); setShowPresets(false); }}
                                className="p-2 text-xs text-left bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-rose-300 hover:bg-rose-50/50 transition-all">
                                <div className="font-bold text-slate-700 dark:text-slate-300">{cs.name}</div>
                                <div className="text-slate-500">{formatEuro(cs.amount)}/{cs.frequency === "annuale" ? "anno" : "mese"}</div>
                            </button>
                        ))}
                        <button onClick={() => { addSub({ name: "", amount: 0, frequency: "mensile" }); setShowPresets(false); }}
                            className="p-2 text-xs text-left bg-white/50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-rose-300 transition-all">
                            <div className="font-bold text-slate-500">Personalizzato...</div>
                        </button>
                    </div>
                )}

                {subscriptions.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                        <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nessun abbonamento tracciato.</p>
                        <p className="text-xs">Aggiungi i tuoi abbonamenti per vedere quanto spendi ogni mese.</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {subscriptions.map((sub) => (
                                <div key={sub.id} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all">
                                    <div className="flex-1 min-w-0">
                                        <Input value={sub.name} onChange={e => updateSub(sub.id, { name: e.target.value })}
                                            placeholder="Nome abbonamento"
                                            className="h-7 text-sm font-bold bg-transparent border-none shadow-none p-0 text-slate-900 dark:text-slate-100" />
                                    </div>
                                    <div className="w-24">
                                        <Input type="number" step="0.01" value={sub.amount} onChange={e => updateSub(sub.id, { amount: Number(e.target.value) })}
                                            className="h-7 text-sm text-right font-mono font-bold bg-transparent border-slate-200 dark:border-slate-700 rounded-lg" />
                                    </div>
                                    <select value={sub.frequency} onChange={e => updateSub(sub.id, { frequency: e.target.value as "mensile" | "annuale" })}
                                        className="h-7 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1 text-slate-600 dark:text-slate-400">
                                        <option value="mensile">Mensile</option>
                                        <option value="annuale">Annuale</option>
                                    </select>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-100" onClick={() => removeSub(sub.id)}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <div className="p-3 bg-rose-50/80 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 text-center">
                                <Label className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Costo Mensile</Label>
                                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatEuro(totals.monthly)}</div>
                            </div>
                            <div className="p-3 bg-rose-50/80 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 text-center">
                                <Label className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Costo Annuale</Label>
                                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatEuro(totals.annual)}</div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
