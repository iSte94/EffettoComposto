"use client";

import { memo, useState } from "react";
import { Brain, Pin, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MemoryEntry {
    id: string;
    category: string;
    fact: string;
    pinned: boolean;
    source: "auto" | "manual";
    createdAt: string;
    updatedAt: string;
}

interface Props {
    memory: MemoryEntry[];
    onTogglePin: (id: string, pinned: boolean) => void;
    onDelete: (id: string) => void;
    onAdd: (category: string, fact: string) => void;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
    profilo: { label: "Profilo", color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20" },
    obiettivo: { label: "Obiettivo", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    decisione: { label: "Decisione", color: "text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20" },
    preferenza: { label: "Preferenza", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" },
    contesto: { label: "Contesto", color: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20" },
};

export const MemoryPanel = memo(function MemoryPanel({ memory, onTogglePin, onDelete, onAdd }: Props) {
    const [open, setOpen] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newCat, setNewCat] = useState("contesto");
    const [newFact, setNewFact] = useState("");

    const pinned = memory.filter((m) => m.pinned);
    const unpinned = memory.filter((m) => !m.pinned);
    const ordered = [...pinned, ...unpinned];

    const submit = () => {
        if (!newFact.trim()) return;
        onAdd(newCat, newFact.trim());
        setNewFact("");
        setAdding(false);
    };

    return (
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2 border-b border-border/60"
            >
                <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    <Brain className="size-4 text-fuchsia-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Memoria AI</span>
                    <span className="text-[10px] text-muted-foreground">({memory.length})</span>
                </div>
                <span className="text-[10px] text-muted-foreground italic">persiste tra sessioni</span>
            </button>

            {open && (
                <div className="p-2 space-y-2">
                    <button
                        onClick={() => setAdding((v) => !v)}
                        className="flex items-center gap-1.5 w-full justify-center py-1.5 rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    >
                        <Plus className="size-3" />
                        {adding ? "Annulla" : "Aggiungi fatto"}
                    </button>

                    {adding && (
                        <div className="rounded-lg border border-border/70 bg-muted/30 p-2 space-y-2">
                            <select
                                value={newCat}
                                onChange={(e) => setNewCat(e.target.value)}
                                className="w-full rounded bg-background px-2 py-1 text-xs border border-border/60"
                            >
                                {Object.keys(CATEGORY_META).map((c) => (
                                    <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                                ))}
                            </select>
                            <textarea
                                value={newFact}
                                onChange={(e) => setNewFact(e.target.value)}
                                placeholder="Es: 'preferisco ETF ad accumulazione, mai distribuzione'"
                                className="w-full rounded bg-background px-2 py-1 text-xs border border-border/60 min-h-[60px] resize-y"
                            />
                            <button
                                onClick={submit}
                                disabled={!newFact.trim()}
                                className="w-full py-1 rounded-md bg-fuchsia-500 text-white text-xs font-semibold hover:bg-fuchsia-600 disabled:opacity-50"
                            >
                                Salva
                            </button>
                        </div>
                    )}

                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                        {ordered.length === 0 && (
                            <div className="p-3 text-center text-xs text-muted-foreground italic">
                                L&apos;AI non ha ancora memorizzato nulla. I fatti rilevanti verranno estratti automaticamente.
                            </div>
                        )}
                        {ordered.map((m) => {
                            const meta = CATEGORY_META[m.category] ?? CATEGORY_META.contesto;
                            return (
                                <div
                                    key={m.id}
                                    className={cn(
                                        "group rounded-lg border p-2 text-xs flex gap-2",
                                        m.pinned ? "border-fuchsia-400/60 bg-fuchsia-500/5" : "border-border/60 bg-background/60",
                                    )}
                                >
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border", meta.color)}>
                                                {meta.label}
                                            </span>
                                            {m.source === "auto" && (
                                                <span className="text-[9px] text-muted-foreground italic">auto</span>
                                            )}
                                        </div>
                                        <p className="text-xs leading-snug text-foreground/90 break-words">{m.fact}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onTogglePin(m.id, !m.pinned)}
                                            className={cn("p-0.5", m.pinned ? "text-fuchsia-500" : "text-muted-foreground hover:text-foreground")}
                                            title={m.pinned ? "Rimuovi pin" : "Pinna"}
                                        >
                                            <Pin className={cn("size-3", m.pinned && "fill-current")} />
                                        </button>
                                        <button
                                            onClick={() => { if (confirm("Eliminare questo fatto?")) onDelete(m.id); }}
                                            className="p-0.5 text-muted-foreground hover:text-rose-500"
                                            title="Elimina"
                                        >
                                            <Trash2 className="size-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});
