"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Target, Plus, Trash2, Pencil, Check, X,
    Home, PiggyBank, TrendingUp, Plane, Sparkles, CircleDot
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

const CATEGORIES: { value: string; label: string; icon: React.ReactNode; color: string }[] = [
    { value: "general", label: "Generale", icon: <Target className="w-4 h-4" />, color: "blue" },
    { value: "emergency", label: "Emergenza", icon: <PiggyBank className="w-4 h-4" />, color: "emerald" },
    { value: "house", label: "Casa", icon: <Home className="w-4 h-4" />, color: "violet" },
    { value: "investment", label: "Investimento", icon: <TrendingUp className="w-4 h-4" />, color: "amber" },
    { value: "travel", label: "Viaggio", icon: <Plane className="w-4 h-4" />, color: "sky" },
    { value: "other", label: "Altro", icon: <Sparkles className="w-4 h-4" />, color: "slate" },
];

function getCategoryInfo(cat: string) {
    return CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];
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

    // Form state
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
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
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
        } catch { /* ignore */ }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch("/api/goals", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            fetchGoals();
        } catch { /* ignore */ }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
                <div className="p-5 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <Target className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Obiettivi di Risparmio</h2>
                <p className="text-slate-500 max-w-md text-sm">Accedi per impostare e tracciare i tuoi obiettivi di risparmio.</p>
            </div>
        );
    }

    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl">
                        <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Obiettivi di Risparmio</h2>
                        <p className="text-xs text-slate-500">Traccia i tuoi progressi verso i tuoi traguardi finanziari</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs"
                    onClick={() => { resetForm(); setShowForm(true); }}
                >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuovo Obiettivo
                </Button>
            </div>

            {/* Overall Progress */}
            {goals.length > 0 && (
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl p-5 shadow-md">
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Progresso Totale</p>
                            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                                {formatEuro(totalCurrent)} <span className="text-sm font-normal text-slate-400">/ {formatEuro(totalTarget)}</span>
                            </p>
                        </div>
                        <span className="text-lg font-bold text-emerald-600">{overallProgress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(overallProgress, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Form */}
            {showForm && (
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-lg">
                    <CardContent className="p-5 space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            {editingId ? "Modifica Obiettivo" : "Nuovo Obiettivo"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500">Nome</Label>
                                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="es. Fondo Emergenza 10k" className="h-9 text-sm rounded-lg" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500">Categoria</Label>
                                <div className="flex flex-wrap gap-1.5">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setFormCategory(cat.value)}
                                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                                                ${formCategory === cat.value
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {cat.icon} {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500">Obiettivo ({"\u20AC"})</Label>
                                <Input type="number" value={formTarget} onChange={e => setFormTarget(e.target.value)} placeholder="10000" className="h-9 text-sm rounded-lg" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500">Gia&apos; risparmiato ({"\u20AC"})</Label>
                                <Input type="number" value={formCurrent} onChange={e => setFormCurrent(e.target.value)} placeholder="0" className="h-9 text-sm rounded-lg" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500">Scadenza (opzionale)</Label>
                                <Input type="month" value={formDeadline} onChange={e => setFormDeadline(e.target.value)} className="h-9 text-sm rounded-lg" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={resetForm}>
                                <X className="w-3.5 h-3.5 mr-1" /> Annulla
                            </Button>
                            <Button size="sm" className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSubmit}>
                                <Check className="w-3.5 h-3.5 mr-1" /> {editingId ? "Salva" : "Crea"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Goals List */}
            {loading ? (
                <div className="text-center py-12 text-slate-400 text-sm">Caricamento...</div>
            ) : goals.length === 0 && !showForm ? (
                <div className="text-center py-16 space-y-3">
                    <CircleDot className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-slate-500 text-sm">Nessun obiettivo impostato. Crea il tuo primo obiettivo di risparmio!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {goals.map(goal => {
                        const catInfo = getCategoryInfo(goal.category);
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
                                : monthsLeft === 0 ? "Scade questo mese" : "Scaduto";
                        }

                        return (
                            <Card key={goal.id} className={`bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-lg ${isComplete ? 'border-emerald-300 dark:border-emerald-700' : 'border-white dark:border-slate-800'}`}>
                                <CardContent className="p-5 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`p-1.5 rounded-lg bg-${catInfo.color}-50 dark:bg-${catInfo.color}-950/50 text-${catInfo.color}-600`}>
                                                {catInfo.icon}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{goal.name}</h4>
                                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{catInfo.label}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-500" onClick={() => startEdit(goal)}>
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => handleDelete(goal.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-baseline">
                                        <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{formatEuro(goal.currentAmount)}</span>
                                        <span className="text-xs text-slate-400">/ {formatEuro(goal.targetAmount)}</span>
                                    </div>

                                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between text-[11px] text-slate-500">
                                        <span>{progress.toFixed(0)}% completato</span>
                                        {!isComplete && <span>Mancano {formatEuro(remaining)}</span>}
                                        {isComplete && <span className="text-emerald-600 font-bold">Obiettivo raggiunto!</span>}
                                    </div>

                                    {(deadlineInfo || estimated) && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {deadlineInfo && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${deadlineInfo.includes("Scaduto") ? 'bg-red-100 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                    {deadlineInfo}
                                                </span>
                                            )}
                                            {estimated && !isComplete && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 font-medium">
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
