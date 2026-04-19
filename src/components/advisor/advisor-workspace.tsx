"use client";

import { useMemo, useState } from "react";
import {
    ArrowUpRight,
    BellRing,
    BookmarkCheck,
    BookmarkPlus,
    Calendar,
    CheckCircle2,
    Clock3,
    FileDown,
    Loader2,
    Scale,
    ShieldCheck,
    Sparkles,
    Target,
    Trash2,
    Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEuro } from "@/lib/format";
import {
    buildAdvisorScenarioFingerprint,
    buildAdvisorScenarioReport,
    buildDefaultAdvisorGoalDraft,
    formatAdvisorFireDelay,
    getAdvisorScenarioName,
    getAdvisorScoreLabel,
} from "@/lib/advisor-workspace";
import type {
    AdvisorReminder,
    AdvisorSavedScenario,
    AdvisorSavedScenarioInput,
} from "@/types";

interface AdvisorGoalDraft {
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string | null;
    category: "general" | "emergency" | "house" | "investment" | "travel" | "other";
}

interface AdvisorReminderDraft {
    triggerType: "date" | "emergency_fund";
    reminderAt: string | null;
    targetEmergencyMonths: number | null;
    note?: string | null;
}

interface AdvisorWorkspaceProps {
    showResults: boolean;
    currentScenario: AdvisorSavedScenarioInput;
    currentSavedScenario: AdvisorSavedScenario | null;
    savedScenarios: AdvisorSavedScenario[];
    reminders: AdvisorReminder[];
    currentEmergencyMonths: number;
    busyAction: string | null;
    onSaveScenario: (note?: string | null) => Promise<void>;
    onToggleShortlist: (desired?: boolean, scenario?: AdvisorSavedScenario) => Promise<void>;
    onCreatePlan: (goal: AdvisorGoalDraft) => Promise<void>;
    onCreateReminder: (reminder: AdvisorReminderDraft) => Promise<void>;
    onDeleteScenario: (id: string) => Promise<void>;
    onDeleteReminder: (id: string) => Promise<void>;
    onLoadScenario: (scenario: AdvisorSavedScenario) => void;
    onExportScenario: (scenario: AdvisorSavedScenario) => void;
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function formatDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toIsoStartOfDay(dateInput: string): string {
    return new Date(`${dateInput}T09:00:00`).toISOString();
}

function monthsBetweenNow(deadline: string | null): number | null {
    if (!deadline) return null;
    const [year, month] = deadline.split("-").map(Number);
    if (!year || !month) return null;

    const now = new Date();
    const total = (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
    return Math.max(1, total + 1);
}

function isReminderReady(reminder: AdvisorReminder, currentEmergencyMonths: number): boolean {
    if (reminder.triggerType === "date") {
        return reminder.reminderAt ? new Date(reminder.reminderAt).getTime() <= Date.now() : false;
    }

    return reminder.targetEmergencyMonths != null
        ? currentEmergencyMonths >= reminder.targetEmergencyMonths
        : false;
}

function getReminderStatusLabel(reminder: AdvisorReminder, currentEmergencyMonths: number): string {
    return isReminderReady(reminder, currentEmergencyMonths) ? "Pronto da rivedere" : "In attesa";
}

function getReminderDescription(reminder: AdvisorReminder, currentEmergencyMonths: number): string {
    if (reminder.triggerType === "date") {
        return reminder.reminderAt
            ? `Rivaluta dal ${new Date(reminder.reminderAt).toLocaleDateString("it-IT")}`
            : "Data non impostata";
    }

    return `Si attiva quando il fondo emergenza torna sopra ${reminder.targetEmergencyMonths ?? 0} mesi. Ora sei a ${currentEmergencyMonths.toFixed(1)} mesi.`;
}

function getMetricTone(score: number): string {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
}

export function AdvisorWorkspace({
    showResults,
    currentScenario,
    currentSavedScenario,
    savedScenarios,
    reminders,
    currentEmergencyMonths,
    busyAction,
    onSaveScenario,
    onToggleShortlist,
    onCreatePlan,
    onCreateReminder,
    onDeleteScenario,
    onDeleteReminder,
    onLoadScenario,
    onExportScenario,
}: AdvisorWorkspaceProps) {
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [saveNote, setSaveNote] = useState("");
    const [planDialogOpen, setPlanDialogOpen] = useState(false);
    const [planDraft, setPlanDraft] = useState<AdvisorGoalDraft>({
        name: "",
        targetAmount: 0,
        currentAmount: 0,
        deadline: null,
        category: "general",
    });
    const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
    const [reminderDraft, setReminderDraft] = useState<AdvisorReminderDraft>({
        triggerType: "date",
        reminderAt: toIsoStartOfDay(formatDateInput(addDays(new Date(), 90))),
        targetEmergencyMonths: 6,
        note: "",
    });

    const currentScenarioPreview = useMemo<AdvisorSavedScenario>(() => ({
        id: currentSavedScenario?.id ?? "preview",
        fingerprint: currentSavedScenario?.fingerprint ?? buildAdvisorScenarioFingerprint(currentScenario.simulation),
        createdAt: currentSavedScenario?.createdAt ?? new Date().toISOString(),
        updatedAt: currentSavedScenario?.updatedAt ?? new Date().toISOString(),
        simulation: currentScenario.simulation,
        summary: currentScenario.summary,
        note: currentSavedScenario?.note ?? currentScenario.note ?? null,
        isShortlisted: currentSavedScenario?.isShortlisted ?? currentScenario.isShortlisted ?? false,
        linkedGoalId: currentSavedScenario?.linkedGoalId ?? currentScenario.linkedGoalId ?? null,
    }), [currentSavedScenario, currentScenario]);

    const shortlistedScenarios = useMemo(
        () => savedScenarios.filter((scenario) => scenario.isShortlisted),
        [savedScenarios],
    );
    const readyReminders = useMemo(
        () => reminders.filter((reminder) => isReminderReady(reminder, currentEmergencyMonths)),
        [reminders, currentEmergencyMonths],
    );
    const bestShortlistedId = useMemo(() => (
        shortlistedScenarios.reduce<string | null>((bestId, scenario) => {
            if (!bestId) return scenario.id;
            const bestScenario = shortlistedScenarios.find((item) => item.id === bestId);
            return (bestScenario?.summary.overallScore ?? 0) >= scenario.summary.overallScore ? bestId : scenario.id;
        }, null)
    ), [shortlistedScenarios]);

    const saveLabel = currentSavedScenario ? "Aggiorna scenario" : "Salva scenario";
    const shortlistLabel = currentSavedScenario?.isShortlisted ? "Rimuovi dalla shortlist" : "Confronta con alternative";
    const isBusy = busyAction !== null;
    const deadlineMonths = monthsBetweenNow(planDraft.deadline);
    const suggestedMonthlyPlan = deadlineMonths
        ? Math.max(0, planDraft.targetAmount - planDraft.currentAmount) / deadlineMonths
        : null;

    const openSaveDialog = () => {
        setSaveNote(currentSavedScenario?.note ?? "");
        setSaveDialogOpen(true);
    };

    const openPlanDialog = () => {
        setPlanDraft(buildDefaultAdvisorGoalDraft(currentScenarioPreview));
        setPlanDialogOpen(true);
    };

    const openReminderDialog = () => {
        setReminderDraft({
            triggerType: "date",
            reminderAt: toIsoStartOfDay(formatDateInput(addDays(new Date(), 90))),
            targetEmergencyMonths: 6,
            note: "",
        });
        setReminderDialogOpen(true);
    };

    const handleSave = async () => {
        await onSaveScenario(saveNote.trim() || null);
        setSaveDialogOpen(false);
    };

    const handleCreatePlan = async () => {
        await onCreatePlan(planDraft);
        setPlanDialogOpen(false);
    };

    const handleCreateReminder = async () => {
        await onCreateReminder(reminderDraft);
        setReminderDialogOpen(false);
    };

    return (
        <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" /> Workspace decisionale
                        </div>
                        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                            Salva ipotesi, crea piani e torna sulle decisioni senza sporcare Patrimonio o FIRE
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                            Qui le simulazioni restano ipotesi operative. Gli impatti reali continuano a entrare nei tuoi numeri solo quando li registri davvero altrove.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[320px]">
                        {[
                            { label: "Scenari", value: String(savedScenarios.length), tone: "text-indigo-600 dark:text-indigo-400" },
                            { label: "Shortlist", value: String(shortlistedScenarios.length), tone: "text-amber-600 dark:text-amber-400" },
                            { label: "Promemoria", value: String(readyReminders.length), tone: "text-emerald-600 dark:text-emerald-400" },
                        ].map((item) => (
                            <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className={`text-lg font-extrabold ${item.tone}`}>{item.value}</div>
                                <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <button
                        type="button"
                        onClick={openSaveDialog}
                        disabled={!showResults || isBusy}
                        className="group rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-sky-500 p-[1px] text-left transition-transform disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 hover:-translate-y-0.5"
                    >
                        <div className="flex h-full min-h-[132px] flex-col justify-between rounded-[calc(1.5rem-1px)] bg-slate-950/95 p-5 text-white">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-sm font-bold">{saveLabel}</div>
                                    <p className="mt-1 text-sm leading-relaxed text-white/75">
                                        Salva nome, prezzo, rata, score, ritardo FIRE e una tua nota operativa.
                                    </p>
                                </div>
                                {busyAction === "save_scenario" ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookmarkPlus className="h-5 w-5 text-sky-300" />}
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-white/75">
                                <span className="rounded-full bg-white/10 px-3 py-1">{getAdvisorScenarioName(currentScenario.simulation)}</span>
                                <span className="rounded-full bg-white/10 px-3 py-1">score {currentScenario.summary.overallScore}/100</span>
                                <span className="rounded-full bg-white/10 px-3 py-1">{formatEuro(currentScenario.summary.totalTCO)} TCO</span>
                            </div>
                        </div>
                    </button>

                    {[
                        {
                            key: "create_plan",
                            title: "Crea piano di acquisto",
                            description: "Trasforma lo scenario in un obiettivo di risparmio concreto.",
                            icon: <Target className="h-5 w-5 text-amber-500" />,
                            onClick: openPlanDialog,
                        },
                        {
                            key: "create_reminder",
                            title: "Rivedi piu avanti",
                            description: "Imposta una data o una soglia del fondo emergenza per tornarci.",
                            icon: <BellRing className="h-5 w-5 text-emerald-500" />,
                            onClick: openReminderDialog,
                        },
                        {
                            key: "toggle_shortlist",
                            title: shortlistLabel,
                            description: "Metti questa ipotesi nella shortlist e confrontala con le alternative.",
                            icon: currentSavedScenario?.isShortlisted ? <BookmarkCheck className="h-5 w-5 text-indigo-500" /> : <Scale className="h-5 w-5 text-indigo-500" />,
                            onClick: () => onToggleShortlist(),
                        },
                        {
                            key: "export",
                            title: "Esporta sintesi",
                            description: "Scarica un mini report decisionale da tenere o condividere.",
                            icon: <FileDown className="h-5 w-5 text-slate-500" />,
                            onClick: () => onExportScenario(currentScenarioPreview),
                        },
                    ].map((action) => (
                        <button
                            key={action.key}
                            type="button"
                            onClick={action.onClick}
                            disabled={!showResults || isBusy}
                            className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                        >
                            <div className="flex min-h-[100px] flex-col justify-between">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{action.title}</div>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{action.description}</p>
                                    </div>
                                    {busyAction === action.key ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : action.icon}
                                </div>
                                <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    <ArrowUpRight className="h-3.5 w-3.5" /> Azione rapida
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {!showResults && (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                        Analizza prima un acquisto per attivare azioni e suggerimenti del workspace.
                    </div>
                )}
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
                <Tabs defaultValue="saved" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3 rounded-2xl">
                        <TabsTrigger value="saved">Scenari salvati ({savedScenarios.length})</TabsTrigger>
                        <TabsTrigger value="shortlist">Shortlist ({shortlistedScenarios.length})</TabsTrigger>
                        <TabsTrigger value="reminders">Promemoria ({reminders.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="saved" className="space-y-3">
                        {savedScenarios.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
                                <Sparkles className="mx-auto mb-3 h-6 w-6 text-slate-400" />
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Nessuno scenario salvato</div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Usa il workspace per salvare ipotesi e costruirti una memoria decisionale pulita.
                                </p>
                            </div>
                        ) : (
                            savedScenarios.map((scenario) => (
                                <div key={scenario.id} className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                                                    {getAdvisorScenarioName(scenario.simulation)}
                                                </h3>
                                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                                                    {scenario.simulation.category}
                                                </span>
                                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getMetricTone(scenario.summary.overallScore)} bg-white shadow-sm dark:bg-slate-900`}>
                                                    {getAdvisorScoreLabel(scenario.summary.overallScore)}
                                                </span>
                                                {scenario.isShortlisted && (
                                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                                                        Shortlist
                                                    </span>
                                                )}
                                                {scenario.linkedGoalId && (
                                                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                        Piano creato
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                                {[
                                                    { label: "Prezzo", value: formatEuro(scenario.simulation.totalPrice) },
                                                    { label: scenario.simulation.isFinanced ? "Rata" : "Esborso", value: scenario.simulation.isFinanced ? `${formatEuro(scenario.summary.monthlyPayment)}/mese` : formatEuro(scenario.summary.cashOutlay) },
                                                    { label: "TCO", value: formatEuro(scenario.summary.totalTCO) },
                                                    { label: "Impatto FIRE", value: formatAdvisorFireDelay(scenario.summary.fireDelayMonthsValue) },
                                                ].map((metric) => (
                                                    <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{metric.label}</div>
                                                        <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{metric.value}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {scenario.note && (
                                                <div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
                                                    {scenario.note}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 lg:items-end">
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                Salvato il {new Date(scenario.updatedAt).toLocaleDateString("it-IT")}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onLoadScenario(scenario)} disabled={isBusy}>
                                                    <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" /> Apri
                                                </Button>
                                                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onToggleShortlist(scenario.isShortlisted ? false : true, scenario)} disabled={isBusy}>
                                                    <Scale className="mr-1.5 h-3.5 w-3.5" /> {scenario.isShortlisted ? "Rimuovi shortlist" : "Shortlist"}
                                                </Button>
                                                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onExportScenario(scenario)} disabled={isBusy}>
                                                    <FileDown className="mr-1.5 h-3.5 w-3.5" /> Esporta
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                                    onClick={() => onDeleteScenario(scenario.id)}
                                                    disabled={isBusy}
                                                >
                                                    {busyAction === "delete_scenario" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                                                    Elimina
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="shortlist" className="space-y-3">
                        {shortlistedScenarios.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
                                <BookmarkCheck className="mx-auto mb-3 h-6 w-6 text-slate-400" />
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Shortlist vuota</div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Aggiungi 2-3 ipotesi e confrontale qui senza perdere il contesto.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-3 lg:grid-cols-3">
                                {shortlistedScenarios.map((scenario) => (
                                    <div
                                        key={scenario.id}
                                        className={`rounded-3xl border p-4 shadow-sm ${bestShortlistedId === scenario.id
                                            ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-700 dark:bg-emerald-950/30"
                                            : "border-slate-200/80 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                                                    {getAdvisorScenarioName(scenario.simulation)}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    Score {scenario.summary.overallScore}/100
                                                </div>
                                            </div>
                                            {bestShortlistedId === scenario.id && (
                                                <span className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                                                    Miglior score
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-4 grid gap-2">
                                            {[
                                                { label: "Prezzo", value: formatEuro(scenario.simulation.totalPrice) },
                                                { label: "Rata / esborso", value: scenario.simulation.isFinanced ? `${formatEuro(scenario.summary.monthlyPayment)}/mese` : formatEuro(scenario.summary.cashOutlay) },
                                                { label: "TCO", value: formatEuro(scenario.summary.totalTCO) },
                                                { label: "FIRE", value: formatAdvisorFireDelay(scenario.summary.fireDelayMonthsValue) },
                                            ].map((metric) => (
                                                <div key={metric.label} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/70">
                                                    <span className="text-slate-500 dark:text-slate-400">{metric.label}</span>
                                                    <span className="font-bold text-slate-900 dark:text-slate-100">{metric.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onLoadScenario(scenario)} disabled={isBusy}>
                                                <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" /> Apri
                                            </Button>
                                            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onExportScenario(scenario)} disabled={isBusy}>
                                                <FileDown className="mr-1.5 h-3.5 w-3.5" /> Esporta
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="reminders" className="space-y-3">
                        {reminders.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
                                <Clock3 className="mx-auto mb-3 h-6 w-6 text-slate-400" />
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">Nessun promemoria</div>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Usa il bottone “Rivedi piu avanti” per farti ritrovare una decisione quando conta davvero.
                                </p>
                            </div>
                        ) : (
                            reminders.map((reminder) => {
                                const linkedScenario = savedScenarios.find((scenario) => scenario.id === reminder.scenarioId)
                                    ?? savedScenarios.find((scenario) => scenario.fingerprint === reminder.scenarioFingerprint);
                                const ready = isReminderReady(reminder, currentEmergencyMonths);

                                return (
                                    <div key={reminder.id} className={`rounded-3xl border p-4 shadow-sm ${ready
                                        ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-700 dark:bg-emerald-950/30"
                                        : "border-slate-200/80 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50"
                                        }`}>
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{reminder.itemName}</h3>
                                                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${ready
                                                        ? "bg-emerald-500 text-white"
                                                        : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                                                        }`}>
                                                        {getReminderStatusLabel(reminder, currentEmergencyMonths)}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
                                                    <span>{getReminderDescription(reminder, currentEmergencyMonths)}</span>
                                                </div>
                                                {reminder.note && (
                                                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                                                        {reminder.note}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                                {linkedScenario && (
                                                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onLoadScenario(linkedScenario)} disabled={isBusy}>
                                                        <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" /> Apri scenario
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                                    onClick={() => onDeleteReminder(reminder.id)}
                                                    disabled={isBusy}
                                                >
                                                    {busyAction === "delete_reminder" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                                                    Rimuovi
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </TabsContent>
                </Tabs>
            </section>

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{saveLabel}</DialogTitle>
                        <DialogDescription>
                            Salviamo questa ipotesi solo dentro il Consulente, con le metriche chiave del momento.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Scenario</div>
                                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{getAdvisorScenarioName(currentScenario.simulation)}</div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Score</div>
                                <div className={`mt-1 text-sm font-bold ${getMetricTone(currentScenario.summary.overallScore)}`}>{currentScenario.summary.overallScore}/100</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="advisor-save-note">Nota operativa (opzionale)</Label>
                            <textarea
                                id="advisor-save-note"
                                value={saveNote}
                                onChange={(event) => setSaveNote(event.target.value)}
                                rows={4}
                                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800/60 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                                placeholder="Perche ti interessa, cosa vuoi verificare, quali dubbi ti rimangono..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Annulla</Button>
                        <Button onClick={handleSave} disabled={busyAction === "save_scenario"}>
                            {busyAction === "save_scenario" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            {saveLabel}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crea piano di acquisto</DialogTitle>
                        <DialogDescription>
                            Questo genera un obiettivo di risparmio vero e proprio, collegato mentalmente allo scenario ma senza alterare il patrimonio.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="advisor-plan-name">Nome obiettivo</Label>
                                <Input id="advisor-plan-name" value={planDraft.name} onChange={(event) => setPlanDraft((draft) => ({ ...draft, name: event.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="advisor-plan-category">Categoria</Label>
                                <Select value={planDraft.category} onValueChange={(value) => setPlanDraft((draft) => ({ ...draft, category: value as AdvisorGoalDraft["category"] }))}>
                                    <SelectTrigger id="advisor-plan-category">
                                        <SelectValue placeholder="Categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">Generale</SelectItem>
                                        <SelectItem value="house">Casa</SelectItem>
                                        <SelectItem value="investment">Investimento</SelectItem>
                                        <SelectItem value="travel">Viaggio</SelectItem>
                                        <SelectItem value="other">Altro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="advisor-plan-target">Target</Label>
                                <Input
                                    id="advisor-plan-target"
                                    type="number"
                                    min={0}
                                    value={planDraft.targetAmount}
                                    onChange={(event) => setPlanDraft((draft) => ({ ...draft, targetAmount: Number(event.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="advisor-plan-current">Gia accantonato</Label>
                                <Input
                                    id="advisor-plan-current"
                                    type="number"
                                    min={0}
                                    value={planDraft.currentAmount}
                                    onChange={(event) => setPlanDraft((draft) => ({ ...draft, currentAmount: Number(event.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <Label htmlFor="advisor-plan-deadline">Scadenza</Label>
                                <Input
                                    id="advisor-plan-deadline"
                                    type="month"
                                    value={planDraft.deadline ?? ""}
                                    onChange={(event) => setPlanDraft((draft) => ({ ...draft, deadline: event.target.value || null }))}
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
                            <div className="flex items-start gap-2">
                                <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    <div className="font-bold">Suggerimento operativo</div>
                                    <p className="mt-1">
                                        Per questo scenario il target consigliato e {formatEuro(planDraft.targetAmount)}.
                                        {suggestedMonthlyPlan != null ? ` Per stare nei tempi dovresti mettere via circa ${formatEuro(suggestedMonthlyPlan)}/mese.` : ""}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Annulla</Button>
                        <Button onClick={handleCreatePlan} disabled={busyAction === "create_plan" || !planDraft.name.trim() || planDraft.targetAmount <= 0}>
                            {busyAction === "create_plan" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
                            Crea piano
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rivedi piu avanti</DialogTitle>
                        <DialogDescription>
                            Imposta un ritorno intelligente su questo scenario: a una certa data oppure quando la tua sicurezza finanziaria torna sopra soglia.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tipo di promemoria</Label>
                            <Select
                                value={reminderDraft.triggerType}
                                onValueChange={(value) => setReminderDraft((draft) => ({ ...draft, triggerType: value as AdvisorReminderDraft["triggerType"] }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date">Fra una certa data</SelectItem>
                                    <SelectItem value="emergency_fund">Quando il fondo emergenza torna sopra soglia</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {reminderDraft.triggerType === "date" ? (
                            <div className="space-y-2">
                                <Label htmlFor="advisor-reminder-date">Data revisione</Label>
                                <Input
                                    id="advisor-reminder-date"
                                    type="date"
                                    value={reminderDraft.reminderAt ? formatDateInput(new Date(reminderDraft.reminderAt)) : ""}
                                    onChange={(event) => setReminderDraft((draft) => ({ ...draft, reminderAt: event.target.value ? toIsoStartOfDay(event.target.value) : null }))}
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="advisor-reminder-threshold">Soglia fondo emergenza (mesi)</Label>
                                <Input
                                    id="advisor-reminder-threshold"
                                    type="number"
                                    min={1}
                                    max={24}
                                    value={reminderDraft.targetEmergencyMonths ?? 6}
                                    onChange={(event) => setReminderDraft((draft) => ({ ...draft, targetEmergencyMonths: Number(event.target.value) || 6 }))}
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Oggi sei a {currentEmergencyMonths.toFixed(1)} mesi di copertura.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="advisor-reminder-note">Nota (opzionale)</Label>
                            <textarea
                                id="advisor-reminder-note"
                                value={reminderDraft.note ?? ""}
                                onChange={(event) => setReminderDraft((draft) => ({ ...draft, note: event.target.value }))}
                                rows={3}
                                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-800/60 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/40"
                                placeholder="Cosa vuoi ricontrollare quando il promemoria scattera?"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>Annulla</Button>
                        <Button onClick={handleCreateReminder} disabled={busyAction === "create_reminder"}>
                            {busyAction === "create_reminder" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                            Salva promemoria
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export function downloadAdvisorScenarioReport(scenario: AdvisorSavedScenario) {
    const content = buildAdvisorScenarioReport(scenario);
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${getAdvisorScenarioName(scenario.simulation).toLowerCase().replace(/\s+/g, "-")}-scenario.md`;
    link.click();
    URL.revokeObjectURL(url);
}
