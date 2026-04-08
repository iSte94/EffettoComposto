"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Target, Plus, Trash2, Pencil, Check, X,
    Home, PiggyBank, TrendingUp, Plane, Sparkles, CircleDot,
} from "lucide-react";
import { formatEuro } from "@/lib/format";
import { format, differenceInMonths, parseISO } from "date-fns";
import { it } from "date-fns/locale";

interface SavingsGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string | null;
    category: string;
    createdAt: string;
}

const CATEGORIES: {
    value: string;
    label: string;
    icon: React.ReactNode;
    activeClass: string;
    iconClass: string;
    badgeClass: string;
    accentClass: string;
}[] = [
    {
        value: "general",
        label: "Generale",
        icon: <Target className="w-4 h-4" />,
        activeClass: "border-blue-300 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
        iconClass: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300",
        badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
        accentClass: "bg-blue-500",
    },
    {
        value: "emergency",
        label: "Emergenza",
        icon: <PiggyBank className="w-4 h-4" />,
        activeClass: "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
        iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
        badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        accentClass: "bg-emerald-500",
    },
    {
        value: "house",
        label: "Casa",
        icon: <Home className="w-4 h-4" />,
        activeClass: "border-violet-300 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
        iconClass: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
        badgeClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
        accentClass: "bg-violet-500",
    },
    {
        value: "investment",
        label: "Investimento",
        icon: <TrendingUp className="w-4 h-4" />,
        activeClass: "border-amber-300 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
        iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
        badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        accentClass: "bg-amber-500",
    },
    {
        value: "travel",
        label: "Viaggio",
        icon: <Plane className="w-4 h-4" />,
        activeClass: "border-sky-300 bg-sky-50 text-sky-700 shadow-sm dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
        iconClass: "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300",
        badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
        accentClass: "bg-sky-500",
    },
    {
        value: "other",
        label: "Altro",
        icon: <Sparkles className="w-4 h-4" />,
        activeClass: "border-slate-300 bg-slate-100 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
        iconClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        accentClass: "bg-slate-500",
    },
];

function getCategoryInfo(category: string) {
    return CATEGORIES.find((item) => item.value === category) || CATEGORIES[0];
}

function getEstimatedDate(current: number, target: number, createdAt: string): string | null {
    if (current >= target) return "Raggiunto!";
    const created = new Date(createdAt);
    const now = new Date();
    const monthsElapsed = Math.max(1, differenceInMonths(now, created));
    const savingsPerMonth = current / monthsElapsed;
    if (savingsPerMonth <= 0) return null;
    const remaining = target - current;
    const monthsToGo = Math.ceil(remaining / savingsPerMonth);
    const estimated = new Date();
    estimated.setMonth(estimated.getMonth() + monthsToGo);
    return format(estimated, "MMM yyyy", { locale: it });
}

interface SavingsGoalsProps {
    user: { username: string } | null;
}

export function SavingsGoals({ user }: SavingsGoalsProps) {
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formName, setFormName] = useState("");
    const [formTarget, setFormTarget] = useState("");
    const [formCurrent, setFormCurrent] = useState("");
    const [formDeadline, setFormDeadline] = useState("");
    const [formCategory, setFormCategory] = useState("general");

    const fetchGoals = useCallback(async () => {
        try {
            const res = await fetch("/api/goals");
            const data = await res.json();
            if (data.goals) setGoals(data.goals);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        fetchGoals();
    }, [user, fetchGoals]);

    const resetForm = () => {
        setFormName("");
        setFormTarget("");
        setFormCurrent("");
        setFormDeadline("");
        setFormCategory("general");
        setShowForm(false);
        setEditingId(null);
    };

    const startEdit = (goal: SavingsGoal) => {
        setEditingId(goal.id);
        setFormName(goal.name);
        setFormTarget(String(goal.targetAmount));
        setFormCurrent(String(goal.currentAmount));
        setFormDeadline(goal.deadline || "");
        setFormCategory(goal.category);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        const payload = {
            name: formName.trim(),
            targetAmount: Number(formTarget) || 0,
            currentAmount: Number(formCurrent) || 0,
            deadline: formDeadline || null,
            category: formCategory,
        };
        if (!payload.name || payload.targetAmount <= 0) return;

        try {
            if (editingId) {
                await fetch("/api/goals", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingId, ...payload }),
                });
            } else {
                await fetch("/api/goals", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }
            resetForm();
            fetchGoals();
        } catch {
            // ignore
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch("/api/goals", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            fetchGoals();
        } catch {
            // ignore
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 px-4 py-16 text-center">
                <div className="rounded-full bg-muted p-5">
                    <Target className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-extrabold text-foreground">Obiettivi di Risparmio</h2>
                <p className="max-w-md text-sm text-muted-foreground">Accedi per impostare e tracciare i tuoi obiettivi di risparmio.</p>
            </div>
        );
    }

    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-950/50">
                        <Target className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Obiettivi di Risparmio</h2>
                        <p className="text-xs text-muted-foreground">Traccia i tuoi progressi verso i tuoi traguardi finanziari</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl text-xs sm:self-auto"
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Nuovo Obiettivo
                </Button>
            </div>

            {goals.length > 0 && (
                <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur-xl">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Progresso Totale</p>
                            <p className="mt-1 text-2xl font-extrabold text-foreground">
                                {formatEuro(totalCurrent)} <span className="text-sm font-normal text-muted-foreground">/ {formatEuro(totalTarget)}</span>
                            </p>
                        </div>
                        <span className="text-lg font-bold text-emerald-600">{overallProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted/70">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                            style={{ width: `${Math.min(overallProgress, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {showForm && (
                <Card className="rounded-3xl border border-emerald-200/80 bg-card/85 shadow-lg backdrop-blur-xl dark:border-emerald-900/80">
                    <CardContent className="space-y-4 p-5">
                        <h3 className="text-sm font-bold text-foreground">{editingId ? "Modifica Obiettivo" : "Nuovo Obiettivo"}</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Nome</Label>
                                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="es. Fondo Emergenza 10k" className="min-h-11 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Categoria</Label>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map((category) => (
                                        <button
                                            key={category.value}
                                            type="button"
                                            onClick={() => setFormCategory(category.value)}
                                            className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                                                formCategory === category.value
                                                    ? category.activeClass
                                                    : "border-border bg-muted/60 text-muted-foreground hover:border-border/80 hover:bg-muted"
                                            }`}
                                        >
                                            {category.icon} {category.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Obiettivo ({"\u20AC"})</Label>
                                <Input type="number" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} placeholder="10000" className="min-h-11 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Gia&apos; risparmiato ({"\u20AC"})</Label>
                                <Input type="number" value={formCurrent} onChange={(e) => setFormCurrent(e.target.value)} placeholder="0" className="min-h-11 rounded-xl text-sm" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Scadenza (opzionale)</Label>
                                <Input type="month" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} className="min-h-11 rounded-xl text-sm" />
                            </div>
                        </div>
                        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                            <Button variant="ghost" size="sm" className="min-h-10 rounded-xl text-xs" onClick={resetForm}>
                                <X className="mr-1 h-3.5 w-3.5" /> Annulla
                            </Button>
                            <Button size="sm" className="min-h-10 rounded-xl bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={handleSubmit}>
                                <Check className="mr-1 h-3.5 w-3.5" /> {editingId ? "Salva" : "Crea"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-12 text-center text-sm text-muted-foreground">Caricamento...</div>
            ) : goals.length === 0 && !showForm ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-16 text-center">
                    <CircleDot className="mx-auto h-10 w-10 text-muted-foreground/70" />
                    <p className="mt-3 text-sm text-muted-foreground">Nessun obiettivo impostato. Crea il tuo primo obiettivo di risparmio!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {goals.map((goal) => {
                        const category = getCategoryInfo(goal.category);
                        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                        const isComplete = progress >= 100;
                        const estimated = getEstimatedDate(goal.currentAmount, goal.targetAmount, goal.createdAt);
                        const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

                        let deadlineInfo: string | null = null;
                        if (goal.deadline) {
                            const deadlineDate = parseISO(goal.deadline + "-01");
                            const monthsLeft = differenceInMonths(deadlineDate, new Date());
                            deadlineInfo = monthsLeft > 0
                                ? `${monthsLeft} mesi rimanenti`
                                : monthsLeft === 0
                                    ? "Scade questo mese"
                                    : "Scaduto";
                        }

                        return (
                            <Card key={goal.id} className={`overflow-hidden rounded-3xl border bg-card/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${isComplete ? "border-emerald-300/80 dark:border-emerald-800" : "border-border/70"}`}>
                                <CardContent className="space-y-3 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`rounded-xl p-2 ${category.iconClass}`}>{category.icon}</div>
                                            <div className="min-w-0">
                                                <h4 className="truncate text-sm font-bold text-foreground">{goal.name}</h4>
                                                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${category.badgeClass}`}>
                                                    {category.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-500" onClick={() => startEdit(goal)}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(goal.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                        <span className="text-lg font-extrabold text-foreground">{formatEuro(goal.currentAmount)}</span>
                                        <span className="text-xs text-muted-foreground">/ {formatEuro(goal.targetAmount)}</span>
                                    </div>

                                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/70">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${isComplete ? "bg-emerald-500" : category.accentClass}`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>

                                    <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
                                        <span>{progress.toFixed(0)}% completato</span>
                                        {!isComplete && <span>Mancano {formatEuro(remaining)}</span>}
                                        {isComplete && <span className="font-bold text-emerald-600">Obiettivo raggiunto!</span>}
                                    </div>

                                    {(deadlineInfo || estimated) && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {deadlineInfo && (
                                                <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${deadlineInfo.includes("Scaduto") ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-muted text-muted-foreground"}`}>
                                                    {deadlineInfo}
                                                </span>
                                            )}
                                            {estimated && !isComplete && (
                                                <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                                    Stima: {estimated}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
