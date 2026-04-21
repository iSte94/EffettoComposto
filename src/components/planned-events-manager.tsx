"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
    ArrowDownCircle,
    ArrowUpCircle,
    CalendarClock,
    CreditCard,
    Gift,
    Lock,
    Pencil,
    Plus,
    ReceiptText,
    Sparkles,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEuro } from "@/lib/format";
import { broadcastFinancialDataChanged } from "@/lib/client-data-events";
import {
    buildPlannedEventsSummary,
    getPlannedEventMonthlyPayment,
} from "@/lib/finance/planned-events";
import { usePlannedEvents } from "@/hooks/usePlannedEvents";
import type {
    PlannedFinancialEvent,
    PlannedFinancialEventDirection,
    PlannedFinancialEventKind,
    PlannedFinancialEventStatus,
} from "@/types";

interface PlannedEventsManagerProps {
    user: { username: string } | null;
}

type EventFilter = "all" | "outflow" | "inflow" | "financed" | "planned";

interface PlannedEventFormState {
    title: string;
    direction: PlannedFinancialEventDirection;
    kind: PlannedFinancialEventKind;
    category: string;
    eventMonth: string;
    amount: string;
    upfrontAmount: string;
    interestRate: string;
    durationMonths: string;
    status: PlannedFinancialEventStatus;
    notes: string;
}

const CATEGORY_OPTIONS = [
    { value: "casa", label: "Casa" },
    { value: "auto", label: "Auto" },
    { value: "famiglia", label: "Famiglia" },
    { value: "studio", label: "Studio" },
    { value: "salute", label: "Salute" },
    { value: "viaggio", label: "Viaggio" },
    { value: "eredita", label: "Eredita" },
    { value: "altro", label: "Altro" },
];

const EMPTY_FORM: PlannedEventFormState = {
    title: "",
    direction: "outflow",
    kind: "one_time",
    category: "altro",
    eventMonth: "",
    amount: "",
    upfrontAmount: "",
    interestRate: "",
    durationMonths: "",
    status: "planned",
    notes: "",
};

function formatEventMonth(value: string): string {
    try {
        return format(parseISO(`${value}-01`), "MMM yyyy", { locale: it });
    } catch {
        return value;
    }
}

function getDirectionMeta(direction: PlannedFinancialEventDirection) {
    if (direction === "inflow") {
        return {
            icon: <ArrowUpCircle className="h-4 w-4 text-emerald-500" />,
            label: "Entrata",
            badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
        };
    }

    return {
        icon: <ArrowDownCircle className="h-4 w-4 text-rose-500" />,
        label: "Uscita",
        badgeClass: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
    };
}

function getStatusBadgeClass(status: PlannedFinancialEventStatus): string {
    switch (status) {
        case "realized":
            return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
        case "canceled":
            return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
        default:
            return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300";
    }
}

function toFormState(event: PlannedFinancialEvent): PlannedEventFormState {
    return {
        title: event.title,
        direction: event.direction,
        kind: event.kind,
        category: event.category,
        eventMonth: event.eventMonth,
        amount: String(event.amount),
        upfrontAmount: event.upfrontAmount != null ? String(event.upfrontAmount) : "",
        interestRate: event.interestRate != null ? String(event.interestRate) : "",
        durationMonths: event.durationMonths != null ? String(event.durationMonths) : "",
        status: event.status,
        notes: event.notes ?? "",
    };
}

function extractApiError(payload: unknown): string {
    if (payload && typeof payload === "object") {
        const record = payload as { error?: string; details?: Array<{ message?: string }> };
        return record.details?.[0]?.message ?? record.error ?? "Operazione non riuscita";
    }
    return "Operazione non riuscita";
}

export function PlannedEventsManager({ user }: PlannedEventsManagerProps) {
    const { events, loading, refresh } = usePlannedEvents(user);
    const [showForm, setShowForm] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [form, setForm] = useState<PlannedEventFormState>(EMPTY_FORM);
    const [busyAction, setBusyAction] = useState<"save" | "delete" | null>(null);
    const [filter, setFilter] = useState<EventFilter>("all");

    const currentMonth = useMemo(() => {
        const today = new Date();
        return `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}`;
    }, []);

    const summary = useMemo(
        () => buildPlannedEventsSummary(events, [12, 24, 36], currentMonth),
        [currentMonth, events],
    );

    const filteredEvents = useMemo(() => {
        return events.filter((event) => {
            switch (filter) {
                case "outflow":
                    return event.direction === "outflow";
                case "inflow":
                    return event.direction === "inflow";
                case "financed":
                    return event.kind === "financed";
                case "planned":
                    return event.status === "planned";
                default:
                    return true;
            }
        });
    }, [events, filter]);

    const amountValue = Number(form.amount) || 0;
    const upfrontValue = Number(form.upfrontAmount) || 0;
    const resolvedKind: PlannedFinancialEventKind = form.direction === "inflow" ? "one_time" : form.kind;
    const resolvedFinancedAmount = resolvedKind === "financed"
        ? Math.max(0, amountValue - upfrontValue)
        : 0;
    const estimatedMonthlyPayment = resolvedKind === "financed"
        ? getPlannedEventMonthlyPayment({
            id: editingEventId ?? "draft",
            title: form.title || "Bozza",
            direction: form.direction,
            kind: resolvedKind,
            category: form.category,
            eventMonth: form.eventMonth || currentMonth,
            amount: amountValue,
            upfrontAmount: upfrontValue,
            financedAmount: resolvedFinancedAmount,
            interestRate: Number(form.interestRate) || 0,
            durationMonths: Number(form.durationMonths) || 0,
            status: form.status,
            notes: form.notes || null,
        })
        : 0;

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setShowForm(false);
        setEditingEventId(null);
    };

    const startCreate = () => {
        setEditingEventId(null);
        setForm({
            ...EMPTY_FORM,
            eventMonth: currentMonth,
        });
        setShowForm(true);
    };

    const startEdit = (event: PlannedFinancialEvent) => {
        setEditingEventId(event.id);
        setForm(toFormState(event));
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!user) {
            toast.error("Accedi per salvare gli eventi futuri");
            return;
        }

        const payload = {
            title: form.title.trim(),
            direction: form.direction,
            kind: resolvedKind,
            category: form.category,
            eventMonth: form.eventMonth,
            amount: amountValue,
            upfrontAmount: resolvedKind === "financed" ? upfrontValue : null,
            financedAmount: resolvedKind === "financed" ? resolvedFinancedAmount : null,
            interestRate: resolvedKind === "financed" ? (Number(form.interestRate) || 0) : null,
            durationMonths: resolvedKind === "financed" ? (Number(form.durationMonths) || 0) : null,
            status: form.status,
            notes: form.notes.trim() || null,
        };

        setBusyAction("save");
        try {
            const res = await fetch("/api/planned-events", {
                method: editingEventId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingEventId ? { id: editingEventId, ...payload } : payload),
            });
            const json = await res.json();

            if (!res.ok) {
                toast.error(extractApiError(json));
                return;
            }

            await refresh(false);
            broadcastFinancialDataChanged({ scope: "planned-events", source: "planned-events-manager" });
            toast.success(editingEventId ? "Evento aggiornato" : "Evento creato");
            resetForm();
        } catch (error) {
            console.error("Errore salvataggio evento futuro:", error);
            toast.error("Errore di rete");
        } finally {
            setBusyAction(null);
        }
    };

    const handleDelete = async (eventId: string) => {
        if (!user) return;
        if (!window.confirm("Vuoi eliminare questo evento futuro?")) return;

        setBusyAction("delete");
        try {
            const res = await fetch("/api/planned-events", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: eventId }),
            });
            const json = await res.json();

            if (!res.ok) {
                toast.error(extractApiError(json));
                return;
            }

            await refresh(false);
            broadcastFinancialDataChanged({ scope: "planned-events", source: "planned-events-manager" });
            toast.success("Evento eliminato");
            if (editingEventId === eventId) resetForm();
        } catch (error) {
            console.error("Errore eliminazione evento futuro:", error);
            toast.error("Errore di rete");
        } finally {
            setBusyAction(null);
        }
    };

    const nextEvent = summary.nextEvent;
    const next12Months = summary.windows[12];

    if (!user) {
        return (
            <div className="rounded-3xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">Eventi Futuri</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Accedi per pianificare spese future, acquisti finanziati o entrate una tantum come eredita.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-violet-50 p-2.5 dark:bg-violet-950/50">
                        <CalendarClock className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Eventi Futuri</h2>
                        <p className="text-xs text-muted-foreground">
                            Pianifica uscite cash, spese finanziate ed entrate una tantum con impatto su cashflow e FIRE.
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="min-h-10 rounded-xl text-xs"
                    onClick={startCreate}
                >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Nuovo Evento
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {[0, 1, 2].map((index) => (
                        <div key={index} className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="mt-3 h-7 w-32" />
                            <Skeleton className="mt-3 h-3 w-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-sm">
                        <CardContent className="space-y-2 p-5">
                            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Prossimo evento</p>
                            <div className="flex items-center gap-2">
                                {nextEvent ? getDirectionMeta(nextEvent.direction).icon : <Sparkles className="h-5 w-5 text-slate-400" />}
                                <p className="text-lg font-extrabold text-foreground">
                                    {nextEvent ? nextEvent.title : "Nessuno"}
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {nextEvent
                                    ? `${formatEventMonth(nextEvent.eventMonth)} • ${formatEuro(nextEvent.amount)}`
                                    : "Non ci sono eventi pianificati in arrivo."}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-sm">
                        <CardContent className="space-y-2 p-5">
                            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Impatto 12 mesi</p>
                            <p className={`text-lg font-extrabold ${next12Months?.netImpact > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {formatEuro(next12Months?.netImpact ?? 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Entrate: {formatEuro(next12Months?.inflows ?? 0)} • Uscite: {formatEuro(next12Months?.outflows ?? 0)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-sm">
                        <CardContent className="space-y-2 p-5">
                            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Rate pianificate</p>
                            <p className="text-lg font-extrabold text-foreground">
                                {summary.maxConcurrentFinancedEvents}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Picco di finanziamenti concorrenti nei prossimi 36 mesi.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                {[
                    { key: "all", label: "Tutti" },
                    { key: "planned", label: "Pianificati" },
                    { key: "outflow", label: "Uscite" },
                    { key: "inflow", label: "Entrate" },
                    { key: "financed", label: "Finanziati" },
                ].map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key as EventFilter)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                            filter === item.key
                                ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
                                : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {showForm && (
                <Card className="rounded-3xl border border-violet-200/80 bg-card/85 shadow-lg backdrop-blur-xl dark:border-violet-900/80">
                    <CardContent className="space-y-4 p-5">
                        <h3 className="text-sm font-bold text-foreground">
                            {editingEventId ? "Modifica evento futuro" : "Nuovo evento futuro"}
                        </h3>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-1.5 xl:col-span-2">
                                <Label className="text-xs text-muted-foreground">Titolo</Label>
                                <Input
                                    value={form.title}
                                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                                    placeholder="es. Auto nuova, caparra casa, eredita zia"
                                    className="min-h-11 rounded-xl text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Mese evento</Label>
                                <Input
                                    type="month"
                                    value={form.eventMonth}
                                    onChange={(event) => setForm((prev) => ({ ...prev, eventMonth: event.target.value }))}
                                    className="min-h-11 rounded-xl text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Direzione</Label>
                                <Select
                                    value={form.direction}
                                    onValueChange={(value) => setForm((prev) => ({
                                        ...prev,
                                        direction: value as PlannedFinancialEventDirection,
                                        kind: value === "inflow" ? "one_time" : prev.kind,
                                    }))}
                                >
                                    <SelectTrigger className="min-h-11 rounded-xl text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="outflow">Uscita</SelectItem>
                                        <SelectItem value="inflow">Entrata</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Modalita&apos;</Label>
                                <Select
                                    value={resolvedKind}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, kind: value as PlannedFinancialEventKind }))}
                                    disabled={form.direction === "inflow"}
                                >
                                    <SelectTrigger className="min-h-11 rounded-xl text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="one_time">Una tantum</SelectItem>
                                        <SelectItem value="financed">Finanziato</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Categoria</Label>
                                <Select
                                    value={form.category}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
                                >
                                    <SelectTrigger className="min-h-11 rounded-xl text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Stato</Label>
                                <Select
                                    value={form.status}
                                    onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as PlannedFinancialEventStatus }))}
                                >
                                    <SelectTrigger className="min-h-11 rounded-xl text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="planned">Planned</SelectItem>
                                        <SelectItem value="realized">Realized</SelectItem>
                                        <SelectItem value="canceled">Canceled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Importo totale (EUR)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={form.amount}
                                    onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                                    className="min-h-11 rounded-xl text-sm"
                                />
                            </div>

                            {resolvedKind === "financed" && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Anticipo (EUR)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={form.upfrontAmount}
                                            onChange={(event) => setForm((prev) => ({ ...prev, upfrontAmount: event.target.value }))}
                                            className="min-h-11 rounded-xl text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Durata (mesi)</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={form.durationMonths}
                                            onChange={(event) => setForm((prev) => ({ ...prev, durationMonths: event.target.value }))}
                                            className="min-h-11 rounded-xl text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Tasso annuo (%)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={form.interestRate}
                                            onChange={(event) => setForm((prev) => ({ ...prev, interestRate: event.target.value }))}
                                            className="min-h-11 rounded-xl text-sm"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {resolvedKind === "financed" && (
                            <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 md:grid-cols-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Quota finanziata</p>
                                    <p className="mt-1 text-sm font-extrabold text-foreground">{formatEuro(resolvedFinancedAmount)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Rata stimata</p>
                                    <p className="mt-1 text-sm font-extrabold text-foreground">{formatEuro(estimatedMonthlyPayment)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Durata</p>
                                    <p className="mt-1 text-sm font-extrabold text-foreground">
                                        {form.durationMonths ? `${form.durationMonths} mesi` : "n/d"}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Note</Label>
                            <textarea
                                value={form.notes}
                                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                                placeholder="Contesto, ipotesi, note sull'evento..."
                                className="min-h-24 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                            <Button variant="ghost" size="sm" className="min-h-10 rounded-xl text-xs" onClick={resetForm}>
                                Annulla
                            </Button>
                            <Button
                                size="sm"
                                className="min-h-10 rounded-xl bg-violet-600 text-xs text-white hover:bg-violet-700"
                                onClick={handleSave}
                                disabled={busyAction === "save"}
                            >
                                {busyAction === "save" ? "Salvataggio..." : editingEventId ? "Aggiorna evento" : "Crea evento"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {[0, 1].map((index) => (
                        <div key={index} className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm space-y-3">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 py-14 text-center">
                    <ReceiptText className="mx-auto h-10 w-10 text-muted-foreground/70" />
                    <p className="mt-3 text-sm text-muted-foreground">
                        Nessun evento trovato per il filtro selezionato.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {filteredEvents.map((event) => {
                        const directionMeta = getDirectionMeta(event.direction);
                        const monthlyPayment = getPlannedEventMonthlyPayment(event);
                        const upfrontAmount = event.kind === "financed" ? (event.upfrontAmount ?? 0) : null;

                        return (
                            <Card
                                key={event.id}
                                className={`overflow-hidden rounded-3xl border bg-card/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                                    event.status !== "planned" ? "opacity-80" : ""
                                }`}
                            >
                                <CardContent className="space-y-4 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {directionMeta.icon}
                                                <h4 className="text-sm font-bold text-foreground">{event.title}</h4>
                                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${directionMeta.badgeClass}`}>
                                                    {directionMeta.label}
                                                </span>
                                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusBadgeClass(event.status)}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                                <span className="rounded-full bg-muted px-2 py-1 font-medium">
                                                    {formatEventMonth(event.eventMonth)}
                                                </span>
                                                <span className="rounded-full bg-muted px-2 py-1 font-medium">
                                                    {CATEGORY_OPTIONS.find((item) => item.value === event.category)?.label ?? event.category}
                                                </span>
                                                <span className="rounded-full bg-muted px-2 py-1 font-medium">
                                                    {event.kind === "financed" ? "Finanziato" : "Una tantum"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-500"
                                                onClick={() => startEdit(event)}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                                                onClick={() => handleDelete(event.id)}
                                                disabled={busyAction === "delete"}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5">
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Importo</p>
                                            <p className={`mt-0.5 text-sm font-extrabold ${event.direction === "inflow" ? "text-emerald-600" : "text-foreground"}`}>
                                                {formatEuro(event.amount)}
                                            </p>
                                        </div>

                                        {event.kind === "financed" ? (
                                            <>
                                                <div className="rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Anticipo</p>
                                                    <p className="mt-0.5 text-sm font-extrabold text-foreground">{formatEuro(upfrontAmount ?? 0)}</p>
                                                </div>
                                                <div className="rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rata stimata</p>
                                                    <p className="mt-0.5 text-sm font-extrabold text-foreground">{formatEuro(monthlyPayment)}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5 sm:col-span-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Impatto
                                                </p>
                                                <p className="mt-0.5 text-sm font-extrabold text-foreground">
                                                    {event.direction === "inflow" ? "Aumenta" : "Riduce"} la liquidita&apos; nel mese pianificato
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {event.kind === "financed" && (
                                        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                                                <CreditCard className="h-3.5 w-3.5" />
                                                {event.durationMonths} mesi
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                                                <Gift className="h-3.5 w-3.5" />
                                                tasso {event.interestRate ?? 0}%
                                            </span>
                                        </div>
                                    )}

                                    {event.notes && (
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            {event.notes}
                                        </p>
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
