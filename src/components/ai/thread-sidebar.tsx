"use client";

import { memo, useState } from "react";
import { MessageSquare, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ThreadSummary {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
}

interface Props {
    threads: ThreadSummary[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    onRename: (id: string, title: string) => void;
    onDelete: (id: string) => void;
    loading?: boolean;
}

function formatRelative(iso: string): string {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const min = Math.floor(diff / 60_000);
    if (min < 1) return "ora";
    if (min < 60) return `${min}m fa`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h fa`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}g fa`;
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export const ThreadSidebar = memo(function ThreadSidebar({ threads, activeId, onSelect, onNew, onRename, onDelete, loading }: Props) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState("");

    const startRename = (t: ThreadSummary) => {
        setEditingId(t.id);
        setDraft(t.title);
    };

    const commitRename = () => {
        if (!editingId) return;
        const v = draft.trim();
        if (v) onRename(editingId, v);
        setEditingId(null);
    };

    return (
        <aside className="flex flex-col gap-2 w-full lg:w-72 shrink-0">
            <Button
                onClick={onNew}
                className="w-full rounded-xl bg-purple-500 text-white hover:bg-purple-600 shadow-sm shadow-purple-500/20"
            >
                <Plus className="size-4 mr-2" />
                Nuova conversazione
            </Button>

            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                    Conversazioni ({threads.length})
                </div>
                <div className="max-h-[60vh] overflow-y-auto lg:max-h-[28rem]">
                    {loading ? (
                        <div className="p-3 text-xs text-muted-foreground">Caricamento…</div>
                    ) : threads.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground italic">Nessuna conversazione</div>
                    ) : (
                        threads.map((t) => {
                            const isActive = t.id === activeId;
                            const isEditing = t.id === editingId;
                            return (
                                <div
                                    key={t.id}
                                    className={cn(
                                        "group relative flex items-center gap-2 border-b border-border/40 px-3 py-2 transition-colors last:border-0",
                                        isActive ? "bg-purple-500/10" : "hover:bg-muted/60",
                                    )}
                                >
                                    {isEditing ? (
                                        <>
                                            <input
                                                autoFocus
                                                value={draft}
                                                onChange={(e) => setDraft(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") commitRename();
                                                    if (e.key === "Escape") setEditingId(null);
                                                }}
                                                className="flex-1 bg-background/80 rounded px-2 py-1 text-xs outline-none border border-purple-400"
                                            />
                                            <button
                                                onClick={commitRename}
                                                className="text-emerald-600 hover:text-emerald-500"
                                                aria-label="Conferma"
                                            >
                                                <Check className="size-4" />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="text-muted-foreground hover:text-foreground"
                                                aria-label="Annulla"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => onSelect(t.id)}
                                                className="flex flex-1 items-start gap-2 text-left min-w-0"
                                            >
                                                <MessageSquare className={cn("size-3.5 mt-0.5 shrink-0", isActive ? "text-purple-500" : "text-muted-foreground")} />
                                                <div className="min-w-0 flex-1">
                                                    <div className={cn("text-xs font-semibold truncate", isActive && "text-purple-700 dark:text-purple-300")}>
                                                        {t.title}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                                        <span>{t.messageCount} msg</span>
                                                        <span className="opacity-40">•</span>
                                                        <span>{formatRelative(t.updatedAt)}</span>
                                                    </div>
                                                </div>
                                            </button>
                                            <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                                                <button
                                                    onClick={() => startRename(t)}
                                                    className="text-muted-foreground hover:text-foreground"
                                                    aria-label="Rinomina"
                                                >
                                                    <Pencil className="size-3" />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm("Eliminare questa conversazione?")) onDelete(t.id); }}
                                                    className="text-muted-foreground hover:text-rose-500"
                                                    aria-label="Elimina"
                                                >
                                                    <Trash2 className="size-3" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </aside>
    );
});
