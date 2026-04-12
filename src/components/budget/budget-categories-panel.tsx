"use client";

import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle, Pencil, X, Check, Plus, Trash2, Tag } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { BudgetCategory } from "@/types/budget";

interface BudgetCategoriesPanelProps {
    categories: BudgetCategory[];
    spendingByCategory: Map<string, number>;
    hasData: boolean;
    onAdd: (cat: Omit<BudgetCategory, "id">) => void;
    onUpdate: (id: string, updates: Partial<BudgetCategory>) => void;
    onRemove: (id: string) => void;
    onOpenTransactions: (categoryName: string) => void;
    onReapply: () => void;
}

interface EditState {
    name: string;
    limit: string;
    keywords: string;
}

function BudgetCategoriesPanelComponent({
    categories,
    spendingByCategory,
    hasData,
    onAdd,
    onUpdate,
    onRemove,
    onOpenTransactions,
    onReapply,
}: BudgetCategoriesPanelProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editState, setEditState] = useState<EditState>({ name: "", limit: "", keywords: "" });
    const [addingNew, setAddingNew] = useState(false);
    const [newState, setNewState] = useState<EditState>({ name: "", limit: "", keywords: "" });

    const startEdit = (cat: BudgetCategory) => {
        setEditingId(cat.id);
        setEditState({
            name: cat.name,
            limit: String(cat.limit),
            keywords: (cat.keywords || []).join(", "),
        });
    };

    const saveEdit = (id: string) => {
        const parsed = {
            name: editState.name.trim() || "Senza nome",
            limit: Math.max(0, Number(editState.limit) || 0),
            keywords: editState.keywords.split(",").map(k => k.trim()).filter(k => k.length > 0),
        };
        onUpdate(id, parsed);
        setEditingId(null);
    };

    const saveNew = () => {
        if (!newState.name.trim()) return;
        onAdd({
            name: newState.name.trim(),
            limit: Math.max(0, Number(newState.limit) || 0),
            keywords: newState.keywords.split(",").map(k => k.trim()).filter(k => k.length > 0),
            color: "#64748b",
        });
        setNewState({ name: "", limit: "", keywords: "" });
        setAddingNew(false);
    };

    return (
        <Card className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl">
            <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-muted-foreground">Budget per Categoria</h3>
                    {hasData && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-lg text-[11px] text-muted-foreground hover:text-violet-600"
                            onClick={onReapply}
                        >
                            <Tag className="mr-1 h-3 w-3" /> Ri-applica regole
                        </Button>
                    )}
                </div>

                <div className="space-y-2">
                    {categories.map((cat) => {
                        const actual = spendingByCategory.get(cat.name) || 0;
                        const overBudget = actual > cat.limit && actual > 0;
                        const pct = cat.limit > 0 ? Math.min(100, (actual / cat.limit) * 100) : 0;
                        const isEditing = editingId === cat.id;
                        const isAltro = cat.name === "Altro";

                        return (
                            <div
                                key={cat.id}
                                className="space-y-2 rounded-2xl border border-border/60 bg-background/50 p-3 transition-colors hover:border-border"
                            >
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <Input
                                                type="text"
                                                value={editState.name}
                                                onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                                                placeholder="Nome"
                                                className="h-9 rounded-xl text-xs"
                                                disabled={isAltro}
                                            />
                                            <Input
                                                type="number"
                                                value={editState.limit}
                                                onChange={(e) => setEditState({ ...editState, limit: e.target.value })}
                                                placeholder="Limite mensile"
                                                className="h-9 rounded-xl text-xs"
                                            />
                                        </div>
                                        <Input
                                            type="text"
                                            value={editState.keywords}
                                            onChange={(e) => setEditState({ ...editState, keywords: e.target.value })}
                                            placeholder="Parole chiave (separate da virgola)"
                                            className="h-9 rounded-xl text-xs"
                                        />
                                        <div className="flex items-center justify-between">
                                            {!isAltro && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 rounded-lg text-[11px] text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                                                    onClick={() => { onRemove(cat.id); setEditingId(null); }}
                                                >
                                                    <Trash2 className="mr-1 h-3 w-3" /> Elimina
                                                </Button>
                                            )}
                                            <div className="ml-auto flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => saveEdit(cat.id)}
                                                    className="rounded-lg p-1.5 text-emerald-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId(null)}
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <button
                                                type="button"
                                                onClick={() => onOpenTransactions(cat.name)}
                                                className="flex items-center gap-2 text-left transition-opacity hover:opacity-80"
                                            >
                                                {overBudget ? (
                                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                                ) : actual > 0 ? (
                                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                                ) : (
                                                    <span
                                                        className="h-2 w-2 rounded-full"
                                                        style={{ backgroundColor: cat.color || "#64748b" }}
                                                    />
                                                )}
                                                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                                                {(cat.keywords?.length || 0) > 0 && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        · {cat.keywords.length} parole chiave
                                                    </span>
                                                )}
                                            </button>
                                            <div className="flex items-center gap-2">
                                                {hasData && (
                                                    <span className={`text-xs font-bold ${overBudget ? "text-red-500" : "text-emerald-600"}`}>
                                                        {formatEuro(actual)}
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground">/ {formatEuro(cat.limit)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(cat)}
                                                    className="rounded-lg p-1 text-slate-300 transition-colors hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-950/20"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                        {hasData && (
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${overBudget ? "bg-red-500" : "bg-emerald-500"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {addingNew ? (
                        <div className="space-y-2 rounded-2xl border border-dashed border-violet-300 bg-violet-50/30 p-3 dark:border-violet-800 dark:bg-violet-950/20">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Input
                                    type="text"
                                    value={newState.name}
                                    onChange={(e) => setNewState({ ...newState, name: e.target.value })}
                                    placeholder="Nome categoria"
                                    className="h-9 rounded-xl text-xs"
                                    autoFocus
                                />
                                <Input
                                    type="number"
                                    value={newState.limit}
                                    onChange={(e) => setNewState({ ...newState, limit: e.target.value })}
                                    placeholder="Limite mensile"
                                    className="h-9 rounded-xl text-xs"
                                />
                            </div>
                            <Input
                                type="text"
                                value={newState.keywords}
                                onChange={(e) => setNewState({ ...newState, keywords: e.target.value })}
                                placeholder="Parole chiave (netflix, spotify, ...)"
                                className="h-9 rounded-xl text-xs"
                            />
                            <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs" onClick={() => setAddingNew(false)}>
                                    Annulla
                                </Button>
                                <Button size="sm" className="h-8 rounded-lg text-xs" onClick={saveNew}>
                                    Aggiungi
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setAddingNew(true)}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-3 text-xs font-medium text-muted-foreground transition-colors hover:border-violet-400 hover:bg-violet-50/40 hover:text-violet-600 dark:hover:bg-violet-950/20"
                        >
                            <Plus className="h-3.5 w-3.5" /> Aggiungi categoria
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export const BudgetCategoriesPanel = memo(BudgetCategoriesPanelComponent);
