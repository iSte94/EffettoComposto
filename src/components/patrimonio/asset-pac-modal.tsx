"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { CalendarClock, History, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatEuro } from "@/lib/format";
import type { AssetPacExecution, AssetPacSchedule, CustomStock, PacCadence, PacTimingConfig } from "@/types";

const WEEKDAYS = [
    { value: "1", label: "Lunedi" },
    { value: "2", label: "Martedi" },
    { value: "3", label: "Mercoledi" },
    { value: "4", label: "Giovedi" },
    { value: "5", label: "Venerdi" },
    { value: "6", label: "Sabato" },
    { value: "0", label: "Domenica" },
];

const MONTHS = [
    { value: "1", label: "Gennaio" },
    { value: "2", label: "Febbraio" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Aprile" },
    { value: "5", label: "Maggio" },
    { value: "6", label: "Giugno" },
    { value: "7", label: "Luglio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Settembre" },
    { value: "10", label: "Ottobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Dicembre" },
];

const CADENCE_LABELS: Record<PacCadence, string> = {
    weekly: "Settimanale",
    monthly: "Mensile",
    quarterly: "Trimestrale",
    semiannual: "Semestrale",
    annual: "Annuale",
};

interface PacFormState {
    editingId: string | null;
    amountEur: string;
    cadence: PacCadence;
    weekday: string;
    dayOfMonth: string;
    useLastDay: boolean;
    anchorMonth: string;
    month: string;
    active: boolean;
}

interface AssetPacModalProps {
    stock: CustomStock;
    trigger?: React.ReactNode;
}

const initialForm: PacFormState = {
    editingId: null,
    amountEur: "100",
    cadence: "monthly",
    weekday: "1",
    dayOfMonth: "1",
    useLastDay: false,
    anchorMonth: "1",
    month: "1",
    active: true,
};

function defaultTimingForCadence(cadence: PacCadence): PacTimingConfig {
    switch (cadence) {
        case "weekly":
            return { weekday: 1 };
        case "monthly":
            return { dayOfMonth: 1, useLastDay: false };
        case "quarterly":
            return { anchorMonth: 1, dayOfMonth: 1, useLastDay: false };
        case "semiannual":
            return { anchorMonth: 1, dayOfMonth: 1, useLastDay: false };
        case "annual":
            return { month: 1, dayOfMonth: 1, useLastDay: false };
    }
}

function normalizeFormTiming(form: PacFormState): PacTimingConfig {
    const dayTiming = form.useLastDay
        ? { useLastDay: true }
        : { dayOfMonth: Math.min(Math.max(Number(form.dayOfMonth) || 1, 1), 28), useLastDay: false };

    switch (form.cadence) {
        case "weekly":
            return { weekday: Number(form.weekday) };
        case "monthly":
            return dayTiming;
        case "quarterly":
        case "semiannual":
            return { ...dayTiming, anchorMonth: Number(form.anchorMonth) };
        case "annual":
            return { ...dayTiming, month: Number(form.month) };
    }
}

function timingToForm(schedule: AssetPacSchedule): PacFormState {
    const timing = schedule.timingConfig ?? {};
    return {
        editingId: schedule.id,
        amountEur: String(schedule.amountEur),
        cadence: schedule.cadence,
        weekday: String(timing.weekday ?? 1),
        dayOfMonth: String(timing.dayOfMonth ?? 1),
        useLastDay: Boolean(timing.useLastDay),
        anchorMonth: String(timing.anchorMonth ?? 1),
        month: String(timing.month ?? 1),
        active: schedule.active,
    };
}

function formatTiming(schedule: AssetPacSchedule): string {
    const timing = schedule.timingConfig ?? {};
    if (schedule.cadence === "weekly") {
        return WEEKDAYS.find((day) => day.value === String(timing.weekday))?.label ?? "giorno non impostato";
    }

    const dayLabel = timing.useLastDay ? "ultimo giorno" : `giorno ${timing.dayOfMonth ?? 1}`;
    if (schedule.cadence === "monthly") return dayLabel;

    if (schedule.cadence === "annual") {
        const month = MONTHS.find((item) => item.value === String(timing.month ?? 1))?.label ?? "Gennaio";
        return `${dayLabel} di ${month}`;
    }

    const anchor = MONTHS.find((item) => item.value === String(timing.anchorMonth ?? 1))?.label ?? "Gennaio";
    return `${dayLabel}, ciclo da ${anchor}`;
}

function describeExecution(execution: AssetPacExecution): string {
    if (execution.status === "executed") {
        return `${formatEuro(execution.amountEur)} a ${formatEuro(execution.priceUsed || 0)}: +${(execution.sharesBought || 0).toFixed(6)} quote`;
    }

    return execution.reason || (execution.status === "skipped" ? "Saltato" : "Fallito");
}

export const AssetPacModal = memo(function AssetPacModal({ stock, trigger }: AssetPacModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [schedules, setSchedules] = useState<AssetPacSchedule[]>([]);
    const [executions, setExecutions] = useState<AssetPacExecution[]>([]);
    const [form, setForm] = useState<PacFormState>(initialForm);

    const activeSchedules = useMemo(() => schedules.filter((schedule) => schedule.active).length, [schedules]);
    const canSubmit = stock.id && stock.ticker.trim() && Number(form.amountEur) > 0;

    const resetForm = () => setForm({ ...initialForm });

    const loadPacData = async () => {
        if (!stock.id) return;
        setLoading(true);
        try {
            const [schedulesRes, executionsRes] = await Promise.all([
                fetch(`/api/pac-schedules?assetKey=${encodeURIComponent(stock.id)}`),
                fetch(`/api/pac-executions?assetKey=${encodeURIComponent(stock.id)}&limit=8`),
            ]);

            if (!schedulesRes.ok || !executionsRes.ok) {
                throw new Error("Impossibile caricare i PAC");
            }

            const schedulesData = await schedulesRes.json();
            const executionsData = await executionsRes.json();
            setSchedules(schedulesData.schedules ?? []);
            setExecutions(executionsData.executions ?? []);
        } catch (error) {
            console.error(error);
            toast.error("Non riesco a caricare i PAC di questo strumento");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        void loadPacData();
    }, [open, stock.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCadenceChange = (cadence: PacCadence) => {
        const timing = defaultTimingForCadence(cadence);
        setForm((prev) => ({
            ...prev,
            cadence,
            weekday: String(timing.weekday ?? prev.weekday),
            dayOfMonth: String(timing.dayOfMonth ?? 1),
            useLastDay: Boolean(timing.useLastDay),
            anchorMonth: String(timing.anchorMonth ?? 1),
            month: String(timing.month ?? 1),
        }));
    };

    const handleSave = async () => {
        if (!canSubmit) {
            toast.error("Inserisci ticker e importo PAC validi");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                assetKey: stock.id,
                assetTicker: stock.ticker.trim().toUpperCase(),
                amountEur: Number(form.amountEur),
                cadence: form.cadence,
                timingConfig: normalizeFormTiming(form),
                active: form.active,
            };

            const response = await fetch(form.editingId ? `/api/pac-schedules/${form.editingId}` : "/api/pac-schedules", {
                method: form.editingId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Salvataggio PAC non riuscito");
            }

            toast.success(form.editingId ? "PAC aggiornato" : "PAC creato");
            resetForm();
            await loadPacData();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Errore durante il salvataggio PAC");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (schedule: AssetPacSchedule) => {
        setSaving(true);
        try {
            const response = await fetch(`/api/pac-schedules/${schedule.id}`, { method: "DELETE" });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Eliminazione PAC non riuscita");
            }

            toast.success("PAC eliminato");
            if (form.editingId === schedule.id) resetForm();
            await loadPacData();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Errore durante l'eliminazione PAC");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (schedule: AssetPacSchedule, active: boolean) => {
        setSaving(true);
        try {
            const response = await fetch(`/api/pac-schedules/${schedule.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active }),
            });
            if (!response.ok) throw new Error("Aggiornamento stato PAC non riuscito");
            await loadPacData();
        } catch (error) {
            console.error(error);
            toast.error("Non riesco ad aggiornare lo stato del PAC");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button variant="outline" size="sm" disabled={!stock.ticker.trim()}>
                        PAC
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <CalendarClock className="h-5 w-5 text-emerald-600" /> PAC automatici su {stock.ticker || "strumento"}
                    </DialogTitle>
                    <DialogDescription>
                        Ogni regola compra un importo fisso in euro. Piu giorni sullo stesso strumento si gestiscono creando piu regole PAC.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                {form.editingId ? "Modifica regola" : "Nuova regola"}
                            </p>
                            <p className="mt-1 text-xs text-emerald-700/80">
                                {activeSchedules} regole attive per questo asset.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Importo per esecuzione</Label>
                            <Input
                                type="number"
                                min="1"
                                value={form.amountEur}
                                onChange={(event) => setForm((prev) => ({ ...prev, amountEur: event.target.value }))}
                                className="h-11 bg-white text-sm font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Cadenza</Label>
                            <Select value={form.cadence} onValueChange={(value) => handleCadenceChange(value as PacCadence)}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CADENCE_LABELS).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {form.cadence === "weekly" ? (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Giorno settimana</Label>
                                <Select value={form.weekday} onValueChange={(value) => setForm((prev) => ({ ...prev, weekday: value }))}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {WEEKDAYS.map((day) => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(form.cadence === "quarterly" || form.cadence === "semiannual") && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Mese iniziale ciclo</Label>
                                        <Select value={form.anchorMonth} onValueChange={(value) => setForm((prev) => ({ ...prev, anchorMonth: value }))}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map((month) => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {form.cadence === "annual" && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Mese</Label>
                                        <Select value={form.month} onValueChange={(value) => setForm((prev) => ({ ...prev, month: value }))}>
                                            <SelectTrigger className="bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map((month) => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Giorno mese</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="28"
                                            disabled={form.useLastDay}
                                            value={form.dayOfMonth}
                                            onChange={(event) => setForm((prev) => ({ ...prev, dayOfMonth: event.target.value }))}
                                            className="h-11 bg-white text-sm font-bold"
                                        />
                                    </div>
                                    <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                                        <Switch
                                            size="sm"
                                            checked={form.useLastDay}
                                            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, useLastDay: checked }))}
                                        />
                                        <span className="text-xs font-semibold text-slate-600">Ultimo giorno</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                            <div>
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Regola attiva</Label>
                                <p className="text-[11px] text-slate-500">Se disattiva resta salvata ma non gira nel job.</p>
                            </div>
                            <Switch checked={form.active} onCheckedChange={(active) => setForm((prev) => ({ ...prev, active }))} />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                                className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                                disabled={saving || !canSubmit}
                                onClick={handleSave}
                            >
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                {form.editingId ? "Salva modifica" : "Crea PAC"}
                            </Button>
                            {form.editingId && (
                                <Button variant="outline" className="rounded-xl" disabled={saving} onClick={resetForm}>
                                    Nuovo
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Regole salvate</p>
                                    <p className="text-[11px] text-slate-400">Esecuzione idempotente: una volta sola per data/regola.</p>
                                </div>
                                {loading && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
                            </div>

                            <div className="space-y-2">
                                {schedules.map((schedule) => (
                                    <div key={schedule.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-extrabold text-slate-900">{formatEuro(schedule.amountEur)}</span>
                                                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                                                        {CADENCE_LABELS[schedule.cadence]}
                                                    </span>
                                                    <span className={schedule.active ? "text-[10px] font-bold text-emerald-600" : "text-[10px] font-bold text-slate-400"}>
                                                        {schedule.active ? "Attivo" : "Pausato"}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">{formatTiming(schedule)}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Switch
                                                    size="sm"
                                                    checked={schedule.active}
                                                    disabled={saving}
                                                    onCheckedChange={(active) => handleToggleActive(schedule, active)}
                                                />
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" disabled={saving} onClick={() => setForm(timingToForm(schedule))}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-rose-500 hover:text-rose-700" disabled={saving} onClick={() => handleDelete(schedule)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {!loading && schedules.length === 0 && (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                                        Nessun PAC configurato per questo strumento.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <History className="h-4 w-4 text-slate-500" />
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ultime esecuzioni</p>
                            </div>
                            <div className="space-y-2">
                                {executions.map((execution) => (
                                    <div key={execution.id} className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <span className="font-bold text-slate-700">{execution.executionDate}</span>
                                            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                execution.status === "executed"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : execution.status === "skipped"
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-rose-100 text-rose-700"
                                            }`}>
                                                {execution.status}
                                            </span>
                                        </div>
                                        <span className="text-slate-500">{describeExecution(execution)}</span>
                                    </div>
                                ))}
                                {!loading && executions.length === 0 && (
                                    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-500">
                                        Non ci sono ancora esecuzioni per questo strumento.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
                        Chiudi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
