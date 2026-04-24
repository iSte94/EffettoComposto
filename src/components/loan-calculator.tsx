"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
    AlertTriangle,
    ArrowUpRight,
    Briefcase,
    Calendar,
    Car,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock3,
    CreditCard,
    Euro,
    FolderOpen,
    Layers3,
    Percent,
    Plus,
    Save,
    Trash2,
    Users,
    XCircle,
} from "lucide-react";
import { formatEuro } from "@/lib/format";
import { usePreferences } from "@/hooks/usePreferences";
import {
    parseLoanCalculatorSavedScenarios,
    removeLoanCalculatorScenario,
    upsertLoanCalculatorScenario,
} from "@/lib/loan-calculator-workspace";
import {
    type ExistingLoan,
    type ExistingLoanPrepaymentSimulation,
    type LoanRecalculationMode,
    getExistingLoanSnapshot,
    simulateLoanPrepayment,
} from "@/lib/finance/loans";
import {
    buildCareerIncomeProjection,
    getProjectedMonthlyIncomeForOwner,
} from "@/lib/finance/career-projection";
import { DTI_THRESHOLD } from "@/lib/constants";
import type {
    LoanCalculatorFinancingSimulation,
    LoanCalculatorIntestatario,
    LoanCalculatorSavedScenario,
    LoanCalculatorSavedScenarioInput,
} from "@/types";
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface AmortizationRow {
    mese: number;
    rata: number;
    capitale: number;
    interessi: number;
    debito: number;
}

interface AmortizationResult {
    installment: number;
    totalPaid: number;
    totalInterest: number;
    schedule: AmortizationRow[];
    chartData: {
        label: string;
        Capitale: number;
        Interessi: number;
        "Debito Residuo": number;
    }[];
}

interface FinancingSimulationComputed extends LoanCalculatorFinancingSimulation {
    label: string;
    principal: number;
    result: AmortizationResult;
    costoPct: number;
}

interface CareerDtiProjectionRow {
    year: number;
    yearOffset: number;
    monthlyIncome: number;
    dtiPct: number;
    maxNewInstallment: number;
    margin: number;
    promotionAmount: number;
}

const DTI_SCALE_MAX = 50;
const DTI_WARNING_THRESHOLD = 40;

function getDtiPosition(value: number) {
    return `${(value / DTI_SCALE_MAX) * 100}%`;
}

const DTI_MARKERS = [
    { value: 0, label: "0%", labelClassName: "text-muted-foreground", style: { left: "0%", transform: "translateX(0)" } },
    { value: 33, label: "33%", labelClassName: "font-medium text-emerald-600", style: { left: getDtiPosition(33), transform: "translateX(-50%)" } },
    { value: DTI_WARNING_THRESHOLD, label: "40%", labelClassName: "font-medium text-amber-500", style: { left: getDtiPosition(DTI_WARNING_THRESHOLD), transform: "translateX(-50%)" } },
    { value: 50, label: "50%", labelClassName: "text-muted-foreground", style: { left: "100%", transform: "translateX(-100%)" } },
] as const;

const DTI_TRACK_SEGMENTS = [
    { start: 0, end: 33, className: "bg-emerald-100/90 dark:bg-emerald-950/40" },
    { start: 33, end: DTI_WARNING_THRESHOLD, className: "bg-amber-100/90 dark:bg-amber-950/35" },
    { start: DTI_WARNING_THRESHOLD, end: DTI_SCALE_MAX, className: "bg-red-100/90 dark:bg-red-950/35" },
] as const;

const savedScenarioDateFormatter = new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
});

function createSimulationId() {
    return Math.random().toString(36).slice(2, 10);
}

function createFinancingSimulation(prefilled: boolean): LoanCalculatorFinancingSimulation {
    return {
        id: createSimulationId(),
        name: "",
        importo: prefilled ? 50000 : 0,
        anticipo: 0,
        hasTradeIn: false,
        tradeInValue: 0,
        tasso: 2.5,
        durata: 60,
    };
}

function getSimulationLabel(index: number) {
    return index === 0 ? "Finanziamento principale" : `Finanziamento ${index + 1}`;
}

function getSimulationDisplayName(simulation: Pick<LoanCalculatorFinancingSimulation, "name">, index: number) {
    const trimmedName = simulation.name.trim();
    return trimmedName || getSimulationLabel(index);
}

function getTradeInAmount(simulation: Pick<LoanCalculatorFinancingSimulation, "hasTradeIn" | "tradeInValue">) {
    return simulation.hasTradeIn ? Math.max(0, simulation.tradeInValue) : 0;
}

function getTotalUpfrontAmount(
    simulation: Pick<LoanCalculatorFinancingSimulation, "anticipo" | "hasTradeIn" | "tradeInValue">,
) {
    return Math.max(0, simulation.anticipo) + getTradeInAmount(simulation);
}

function getSimulationPrincipal(
    simulation: Pick<LoanCalculatorFinancingSimulation, "importo" | "anticipo" | "hasTradeIn" | "tradeInValue">,
) {
    return Math.max(0, simulation.importo - getTotalUpfrontAmount(simulation));
}

function formatSavedScenarioDate(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Data non disponibile" : savedScenarioDateFormatter.format(parsed);
}

function formatWaitLabel(yearOffset: number) {
    if (yearOffset <= 0) return "oggi";
    if (yearOffset === 1) return "tra circa 12 mesi";
    return `tra circa ${yearOffset} anni`;
}

function getIntestatarioLabel(
    intestatario: LoanCalculatorIntestatario,
    person1Name: string,
    person2Name: string,
) {
    if (intestatario === "person1") return person1Name;
    if (intestatario === "person2") return person2Name;
    return "Entrambi";
}

function getRecalculationModeLabel(mode: LoanRecalculationMode) {
    switch (mode) {
        case "french":
            return "Rata ricalcolata con tasso salvato e durata residua invariata";
        case "growing":
            return "Rata ricalcolata come piano crescente mantenendo la progressione attuale";
        case "linear":
            return "Rata ricalcolata in modo lineare sul debito residuo";
        default:
            return "Stima proporzionale: aggiungi importo originario e tasso per massima precisione";
    }
}

function computeAmortization(principal: number, annualRatePct: number, months: number): AmortizationResult {
    const empty: AmortizationResult = {
        installment: 0,
        totalPaid: 0,
        totalInterest: 0,
        schedule: [],
        chartData: [],
    };

    if (principal <= 0 || months <= 0) return empty;

    const monthlyRate = annualRatePct / 100 / 12;
    const installment =
        monthlyRate === 0
            ? principal / months
            : (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);

    const schedule: AmortizationRow[] = [];
    let balance = principal;

    for (let month = 1; month <= months; month++) {
        const interest = balance * monthlyRate;
        const capital = installment - interest;
        balance = Math.max(0, balance - capital);
        schedule.push({
            mese: month,
            rata: installment,
            capitale: capital,
            interessi: interest,
            debito: balance,
        });
    }

    const yearCount = Math.ceil(months / 12);
    const chartData = Array.from({ length: yearCount }, (_, yearIndex) => {
        const rows = schedule.slice(yearIndex * 12, (yearIndex + 1) * 12);
        const capitalSum = rows.reduce((sum, row) => sum + row.capitale, 0);
        const interestSum = rows.reduce((sum, row) => sum + row.interessi, 0);
        const lastRow = rows[rows.length - 1];

        return {
            label: yearCount <= 10 ? `Anno ${yearIndex + 1}` : `A${yearIndex + 1}`,
            Capitale: Math.round(capitalSum),
            Interessi: Math.round(interestSum),
            "Debito Residuo": Math.round(lastRow?.debito ?? 0),
        };
    });

    return {
        installment,
        totalPaid: installment * months,
        totalInterest: installment * months - principal,
        schedule,
        chartData,
    };
}

function aggregateAmortizationResults(results: AmortizationResult[]): AmortizationResult {
    const empty: AmortizationResult = {
        installment: 0,
        totalPaid: 0,
        totalInterest: 0,
        schedule: [],
        chartData: [],
    };

    if (results.length === 0) return empty;

    const maxMonths = Math.max(...results.map((result) => result.schedule.length));
    if (maxMonths <= 0) return empty;

    const schedule = Array.from({ length: maxMonths }, (_, monthIndex) => {
        const rows = results
            .map((result) => result.schedule[monthIndex])
            .filter((row): row is AmortizationRow => Boolean(row));

        return {
            mese: monthIndex + 1,
            rata: rows.reduce((sum, row) => sum + row.rata, 0),
            capitale: rows.reduce((sum, row) => sum + row.capitale, 0),
            interessi: rows.reduce((sum, row) => sum + row.interessi, 0),
            debito: rows.reduce((sum, row) => sum + row.debito, 0),
        };
    });

    const yearCount = Math.ceil(maxMonths / 12);
    const chartData = Array.from({ length: yearCount }, (_, yearIndex) => {
        const rows = schedule.slice(yearIndex * 12, (yearIndex + 1) * 12);
        const capitalSum = rows.reduce((sum, row) => sum + row.capitale, 0);
        const interestSum = rows.reduce((sum, row) => sum + row.interessi, 0);
        const lastRow = rows[rows.length - 1];

        return {
            label: yearCount <= 10 ? `Anno ${yearIndex + 1}` : `A${yearIndex + 1}`,
            Capitale: Math.round(capitalSum),
            Interessi: Math.round(interestSum),
            "Debito Residuo": Math.round(lastRow?.debito ?? 0),
        };
    });

    return {
        installment: schedule[0]?.rata ?? 0,
        totalPaid: results.reduce((sum, result) => sum + result.totalPaid, 0),
        totalInterest: results.reduce((sum, result) => sum + result.totalInterest, 0),
        schedule,
        chartData,
    };
}

export function LoanCalculator() {
    const [simulations, setSimulations] = useState<LoanCalculatorFinancingSimulation[]>(() => [createFinancingSimulation(true)]);
    const [showOverallTable, setShowOverallTable] = useState(false);
    const [intestatario, setIntestatario] = useState<LoanCalculatorIntestatario>("person1");
    const [enableDebtReductionSimulation, setEnableDebtReductionSimulation] = useState(false);
    const [selectedExistingLoanId, setSelectedExistingLoanId] = useState("");
    const [selectedPrepaymentAmount, setSelectedPrepaymentAmount] = useState(0);
    const [scenarioName, setScenarioName] = useState("");
    const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);

    const { preferences, isLoaded, updatePreference } = usePreferences();

    const person1Name = preferences.person1Name || "Persona 1";
    const person2Name = preferences.person2Name || "Persona 2";
    const savedScenarios = useMemo(
        () => parseLoanCalculatorSavedScenarios(preferences.loanCalculatorSavedScenarios),
        [preferences.loanCalculatorSavedScenarios],
    );

    const savedScenarioSummaries = useMemo(
        () =>
            savedScenarios.map((scenario) => {
                const entries = scenario.simulations
                    .map((simulation, index) => {
                        const principal = getSimulationPrincipal(simulation);
                        const result = computeAmortization(principal, simulation.tasso, simulation.durata);

                        return {
                            name: getSimulationDisplayName(simulation, index),
                            importo: simulation.importo,
                            anticipo: simulation.anticipo,
                            tradeInAmount: getTradeInAmount(simulation),
                            totalUpfront: getTotalUpfrontAmount(simulation),
                            principal,
                            result,
                            duration: simulation.durata,
                            rate: simulation.tasso,
                        };
                    });

                const activeEntries = entries.filter((entry) => entry.principal > 0 && entry.result.installment > 0);

                return {
                    scenario,
                    entries,
                    activeCount: activeEntries.length,
                    totalInstallment: activeEntries.reduce((sum, entry) => sum + entry.result.installment, 0),
                    totalPrincipal: activeEntries.reduce((sum, entry) => sum + entry.principal, 0),
                };
            }),
        [savedScenarios],
    );

    const careerIncomeProjection = useMemo(
        () =>
            buildCareerIncomeProjection({
                progressionRaw: preferences.careerProgression,
                person1MonthlyIncome: preferences.person1Income || 0,
                person2MonthlyIncome: preferences.person2Income || 0,
            }),
        [preferences.careerProgression, preferences.person1Income, preferences.person2Income],
    );

    const simulationEntries = useMemo<FinancingSimulationComputed[]>(
        () =>
            simulations.map((simulation, index) => {
                const principal = getSimulationPrincipal(simulation);
                const result = computeAmortization(principal, simulation.tasso, simulation.durata);

                return {
                    ...simulation,
                    label: getSimulationDisplayName(simulation, index),
                    principal,
                    result,
                    costoPct: principal > 0 ? (result.totalInterest / principal) * 100 : 0,
                };
            }),
        [simulations],
    );

    const activeSimulationEntries = useMemo(
        () => simulationEntries.filter((entry) => entry.principal > 0 && entry.result.installment > 0),
        [simulationEntries],
    );

    const aggregatePrincipal = useMemo(
        () => activeSimulationEntries.reduce((sum, entry) => sum + entry.principal, 0),
        [activeSimulationEntries],
    );

    const aggregateResult = useMemo(
        () => aggregateAmortizationResults(activeSimulationEntries.map((entry) => entry.result)),
        [activeSimulationEntries],
    );

    const aggregateCostPct = aggregatePrincipal > 0 ? (aggregateResult.totalInterest / aggregatePrincipal) * 100 : 0;

    const persistSavedScenarios = (nextScenarios: LoanCalculatorSavedScenario[]) => {
        updatePreference("loanCalculatorSavedScenarios", JSON.stringify(nextScenarios));
    };

    const buildScenarioInput = (): LoanCalculatorSavedScenarioInput | null => {
        const trimmedName = scenarioName.trim();
        if (!trimmedName) {
            toast.error("Dai un nome allo scenario prima di salvarlo.");
            return null;
        }

        return {
            name: trimmedName,
            simulations: simulations.map((simulation) => {
                const importo = Math.max(0, simulation.importo);
                const anticipo = Math.max(0, Math.min(simulation.anticipo, importo));
                const remainingAfterAnticipo = Math.max(0, importo - anticipo);
                const tradeInValue = simulation.hasTradeIn
                    ? Math.max(0, Math.min(simulation.tradeInValue, remainingAfterAnticipo))
                    : 0;

                return {
                    id: simulation.id || createSimulationId(),
                    name: simulation.name.trim(),
                    importo,
                    anticipo,
                    hasTradeIn: simulation.hasTradeIn,
                    tradeInValue,
                    tasso: Math.max(0, simulation.tasso),
                    durata: Math.max(6, Math.min(120, simulation.durata)),
                };
            }),
            intestatario,
            enableDebtReductionSimulation,
            selectedExistingLoanId: selectedExistingLoanId || null,
            selectedPrepaymentAmount: Math.max(0, selectedPrepaymentAmount),
        };
    };

    const handleSaveScenario = (mode: "update" | "new") => {
        if (!isLoaded) return;

        const input = buildScenarioInput();
        if (!input) return;

        const result = upsertLoanCalculatorScenario(savedScenarios, input, {
            scenarioId: mode === "update" ? editingScenarioId ?? undefined : undefined,
        });

        persistSavedScenarios(result.scenarios);
        setEditingScenarioId(result.scenario.id);
        setScenarioName(result.scenario.name);

        toast.success(
            mode === "update" && editingScenarioId
                ? `Scenario "${result.scenario.name}" aggiornato nelle preferenze.`
                : `Scenario "${result.scenario.name}" salvato nelle preferenze.`,
        );
    };

    const handleLoadScenario = (scenario: LoanCalculatorSavedScenario) => {
        setSimulations(
            scenario.simulations.length > 0
                ? scenario.simulations.map((simulation) => ({
                    ...simulation,
                    id: simulation.id || createSimulationId(),
                }))
                : [createFinancingSimulation(true)],
        );
        setIntestatario(scenario.intestatario);
        setEnableDebtReductionSimulation(scenario.enableDebtReductionSimulation);
        setSelectedExistingLoanId(scenario.selectedExistingLoanId ?? "");
        setSelectedPrepaymentAmount(scenario.selectedPrepaymentAmount);
        setScenarioName(scenario.name);
        setEditingScenarioId(scenario.id);
        setShowOverallTable(false);
        toast.success(`Scenario "${scenario.name}" ripristinato.`);
    };

    const handleDeleteScenario = (scenarioId: string) => {
        const scenario = savedScenarios.find((current) => current.id === scenarioId);
        const nextScenarios = removeLoanCalculatorScenario(savedScenarios, scenarioId);

        persistSavedScenarios(nextScenarios);

        if (editingScenarioId === scenarioId) {
            setEditingScenarioId(null);
        }

        toast.success(
            scenario ? `Scenario "${scenario.name}" eliminato.` : "Scenario eliminato.",
        );
    };

    const existingLoans: ExistingLoan[] = useMemo(() => {
        try {
            return JSON.parse(preferences.existingLoansList);
        } catch {
            return [];
        }
    }, [preferences.existingLoansList]);

    const relevantLoanEntries = useMemo(() => {
        const scopedLoans =
            intestatario === "both"
                ? existingLoans
                : existingLoans.filter((loan) => (intestatario === "person1" ? loan.owner !== "person2" : loan.owner !== "person1"));

        return scopedLoans.map((loan) => ({
            loan,
            snapshot: getExistingLoanSnapshot(loan),
        }));
    }, [existingLoans, intestatario]);

    const activeLoanEntries = useMemo(
        () => relevantLoanEntries.filter(({ snapshot }) => snapshot.isActive && snapshot.currentInstallment > 0 && snapshot.remainingDebt > 0),
        [relevantLoanEntries],
    );

    const effectiveSelectedLoanId =
        activeLoanEntries.some(({ loan }) => loan.id === selectedExistingLoanId)
            ? selectedExistingLoanId
            : activeLoanEntries[0]?.loan.id ?? "";

    const selectedLoanEntry = useMemo(
        () => activeLoanEntries.find(({ loan }) => loan.id === effectiveSelectedLoanId) ?? null,
        [activeLoanEntries, effectiveSelectedLoanId],
    );

    const clampedPrepaymentAmount = selectedLoanEntry
        ? Math.min(Math.max(0, selectedPrepaymentAmount), selectedLoanEntry.snapshot.remainingDebt)
        : 0;

    const debtReductionSimulation = useMemo<ExistingLoanPrepaymentSimulation | null>(() => {
        if (!enableDebtReductionSimulation || !selectedLoanEntry) return null;
        return simulateLoanPrepayment(selectedLoanEntry.loan, clampedPrepaymentAmount);
    }, [clampedPrepaymentAmount, enableDebtReductionSimulation, selectedLoanEntry]);

    const activeDebtReductionSimulation =
        enableDebtReductionSimulation && debtReductionSimulation && clampedPrepaymentAmount > 0
            ? debtReductionSimulation
            : null;

    const dtiData = useMemo(() => {
        const existingInstallment = activeLoanEntries.reduce((sum, { snapshot }) => sum + snapshot.currentInstallment, 0);
        const adjustedExistingInstallment = activeLoanEntries.reduce((sum, entry) => {
            if (activeDebtReductionSimulation && entry.loan.id === selectedLoanEntry?.loan.id) {
                return sum + activeDebtReductionSimulation.newInstallment;
            }

            return sum + entry.snapshot.currentInstallment;
        }, 0);

        const income =
            intestatario === "person1"
                ? preferences.person1Income || 0
                : intestatario === "person2"
                ? preferences.person2Income || 0
                : (preferences.person1Income || 0) + (preferences.person2Income || 0);

        const totalNewInstallment = activeSimulationEntries.reduce((sum, entry) => sum + entry.result.installment, 0);
        const totalInstallment = adjustedExistingInstallment + totalNewInstallment;
        const baselineTotalInstallment = existingInstallment + totalNewInstallment;
        const dti = income > 0 ? totalInstallment / income : 0;
        const baselineDti = income > 0 ? baselineTotalInstallment / income : 0;
        const maxNewInstallment = Math.max(0, income * DTI_THRESHOLD - adjustedExistingInstallment);
        const baselineMaxNewInstallment = Math.max(0, income * DTI_THRESHOLD - existingInstallment);

        return {
            activeExistingCount: activeLoanEntries.length,
            existingInstallment,
            adjustedExistingInstallment,
            income,
            totalNewInstallment,
            totalInstallment,
            baselineTotalInstallment,
            dti,
            baselineDti,
            dtiPct: dti * 100,
            baselineDtiPct: baselineDti * 100,
            dtiImprovementPct: Math.max(0, (baselineDti - dti) * 100),
            isOk: dti > 0 && dti <= DTI_THRESHOLD,
            isWarning: dti > DTI_THRESHOLD && dti <= DTI_WARNING_THRESHOLD / 100,
            isDanger: dti > DTI_WARNING_THRESHOLD / 100,
            hasIncome: income > 0,
            maxNewInstallment,
            baselineMaxNewInstallment,
            hasSimulation: Boolean(activeDebtReductionSimulation),
            simulatedLoanName: selectedLoanEntry?.loan.name ?? "",
            simulatedPrepayment: activeDebtReductionSimulation?.appliedPrepayment ?? 0,
            simulatedMonthlySavings: activeDebtReductionSimulation?.monthlySavings ?? 0,
        };
    }, [
        activeDebtReductionSimulation,
        activeLoanEntries,
        activeSimulationEntries,
        intestatario,
        preferences.person1Income,
        preferences.person2Income,
        selectedLoanEntry,
    ]);

    const careerDtiAnalysis = useMemo(() => {
        const rows: CareerDtiProjectionRow[] = careerIncomeProjection.points.map((point) => {
            const monthlyIncome = getProjectedMonthlyIncomeForOwner(point, intestatario);
            const maxNewInstallment = Math.max(0, monthlyIncome * DTI_THRESHOLD - dtiData.adjustedExistingInstallment);
            const margin = maxNewInstallment - dtiData.totalNewInstallment;
            const promotionAmount =
                intestatario === "person1"
                    ? point.person1PromotionAmount
                    : intestatario === "person2"
                    ? point.person2PromotionAmount
                    : point.person1PromotionAmount + point.person2PromotionAmount;

            return {
                year: point.year,
                yearOffset: point.yearOffset,
                monthlyIncome,
                dtiPct: monthlyIncome > 0 ? (dtiData.totalInstallment / monthlyIncome) * 100 : 0,
                maxNewInstallment,
                margin,
                promotionAmount,
            };
        });

        const current = rows[0] ?? null;
        const last = rows[rows.length - 1] ?? null;
        const firstFutureFit = rows.find((row) => row.yearOffset > 0 && row.margin >= 0) ?? null;
        const visibleOffsets = new Set([0, 1, 2, 3]);

        if (firstFutureFit) visibleOffsets.add(firstFutureFit.yearOffset);
        if (last) visibleOffsets.add(last.yearOffset);

        return {
            rows,
            current,
            last,
            firstFutureFit,
            previewRows: rows.filter((row) => visibleOffsets.has(row.yearOffset)).slice(0, 6),
            currentGap: Math.max(0, dtiData.totalNewInstallment - (current?.maxNewInstallment ?? 0)),
        };
    }, [
        careerIncomeProjection.points,
        dtiData.adjustedExistingInstallment,
        dtiData.totalInstallment,
        dtiData.totalNewInstallment,
        intestatario,
    ]);

    const suggestedPrepaymentForThreshold = useMemo(() => {
        if (!selectedLoanEntry || dtiData.income <= 0) return 0;

        const otherInstallments = activeLoanEntries.reduce((sum, entry) => {
            return entry.loan.id === selectedLoanEntry.loan.id ? sum : sum + entry.snapshot.currentInstallment;
        }, 0);

        const targetSelectedLoanInstallment = dtiData.income * DTI_THRESHOLD - dtiData.totalNewInstallment - otherInstallments;

        if (targetSelectedLoanInstallment <= 0) {
            return selectedLoanEntry.snapshot.remainingDebt;
        }

        if (selectedLoanEntry.snapshot.currentInstallment <= targetSelectedLoanInstallment) {
            return 0;
        }

        let low = 0;
        let high = selectedLoanEntry.snapshot.remainingDebt;

        for (let iteration = 0; iteration < 30; iteration++) {
            const mid = (low + high) / 2;
            const simulation = simulateLoanPrepayment(selectedLoanEntry.loan, mid);

            if (simulation.newInstallment <= targetSelectedLoanInstallment) {
                high = mid;
            } else {
                low = mid;
            }
        }

        return Math.min(selectedLoanEntry.snapshot.remainingDebt, high);
    }, [activeLoanEntries, dtiData.income, dtiData.totalNewInstallment, selectedLoanEntry]);

    const dtiProgressPct = Math.min(100, (dtiData.dtiPct / DTI_SCALE_MAX) * 100);
    const dtiIndicatorValue = Math.min(DTI_SCALE_MAX, Math.max(0, dtiData.dtiPct));
    const dtiIndicatorTransform =
        dtiIndicatorValue <= 4
            ? "translateX(0)"
            : dtiIndicatorValue >= DTI_SCALE_MAX - 4
            ? "translateX(-100%)"
            : "translateX(-50%)";

    const dtiAccentClasses = dtiData.isOk
        ? {
            badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/60 dark:text-emerald-300",
            fill: "bg-emerald-500",
            marker: "bg-emerald-500 ring-emerald-500/25",
        }
        : dtiData.isWarning
        ? {
            badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/60 dark:text-amber-300",
            fill: "bg-amber-500",
            marker: "bg-amber-500 ring-amber-500/25",
        }
        : {
            badge: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/80 dark:bg-red-950/60 dark:text-red-300",
            fill: "bg-red-500",
            marker: "bg-red-500 ring-red-500/25",
        };

    const previewNewInstallment = debtReductionSimulation?.newInstallment ?? selectedLoanEntry?.snapshot.currentInstallment ?? 0;
    const previewMonthlySavings = debtReductionSimulation?.monthlySavings ?? 0;
    const debtReductionSliderStep = selectedLoanEntry
        ? selectedLoanEntry.snapshot.remainingDebt <= 5000
            ? 50
            : selectedLoanEntry.snapshot.remainingDebt <= 20000
            ? 100
            : 500
        : 100;

    const activeSimulationSummaryLabel =
        activeSimulationEntries.length === 1 ? "la simulazione attiva" : `le ${activeSimulationEntries.length} simulazioni attive`;

    const updateSimulation = <K extends keyof LoanCalculatorFinancingSimulation>(
        simulationId: string,
        field: K,
        value: LoanCalculatorFinancingSimulation[K],
    ) => {
        setSimulations((current) =>
            current.map((simulation) => (simulation.id === simulationId ? { ...simulation, [field]: value } : simulation)),
        );
    };

    const addSimulation = () => {
        setSimulations((current) => [...current, createFinancingSimulation(false)]);
    };

    const removeSimulation = (simulationId: string) => {
        setSimulations((current) => (current.length <= 1 ? current : current.filter((simulation) => simulation.id !== simulationId)));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-orange-50 p-2.5 dark:bg-orange-950/50">
                    <Car className="h-6 w-6 text-orange-500 dark:text-orange-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Calcolatore Rata Finanziamento</h2>
                    <p className="text-xs text-muted-foreground">
                        Ammortamento alla francese - auto, moto, arredamento e altri prestiti personali
                    </p>
                </div>
            </div>

            <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <CardContent className="space-y-5 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-300">
                                <Save className="h-3.5 w-3.5" />
                                Scenari salvati
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Salva, riprendi e modifica le tue simulazioni</h3>
                                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                    Dai un nome allo scenario corrente e ritrovalo quando vuoi per riaprire tutte le card, l&apos;intestatario e l&apos;eventuale leva anti-DTI.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-right shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Archivio</p>
                            <p className="text-base font-bold text-foreground">{savedScenarios.length} scenari</p>
                            <p className="text-[11px] text-muted-foreground">
                                {editingScenarioId ? "stai modificando uno scenario salvato" : "salvati nell'account o nel browser"}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Nome scenario</Label>
                            <Input
                                value={scenarioName}
                                onChange={(event) => setScenarioName(event.target.value)}
                                placeholder="Es. Auto + arredamento estate 2026"
                                className="min-h-11 rounded-xl text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row lg:items-end">
                            <button
                                type="button"
                                onClick={() => handleSaveScenario(editingScenarioId ? "update" : "new")}
                                disabled={!isLoaded}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Save className="h-4 w-4" />
                                {editingScenarioId ? "Aggiorna scenario" : "Salva scenario"}
                            </button>

                            {editingScenarioId && (
                                <button
                                    type="button"
                                    onClick={() => handleSaveScenario("new")}
                                    disabled={!isLoaded}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/80 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Plus className="h-4 w-4" />
                                    Salva come nuovo
                                </button>
                            )}
                        </div>
                    </div>

                    {editingScenarioId && (
                        <p className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-300">
                            Lo scenario corrente e collegato a un salvataggio esistente: se premi <span className="font-semibold">Aggiorna scenario</span> sovrascrivi quello, mentre <span className="font-semibold">Salva come nuovo</span> crea una copia separata.
                        </p>
                    )}

                    {savedScenarioSummaries.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                            {savedScenarioSummaries.map(({ scenario, entries, activeCount, totalInstallment, totalPrincipal }) => (
                                <div
                                    key={scenario.id}
                                    className={`rounded-2xl border p-4 shadow-sm transition-colors ${
                                        scenario.id === editingScenarioId
                                            ? "border-orange-200 bg-orange-50/80 dark:border-orange-900/60 dark:bg-orange-950/20"
                                            : "border-border/70 bg-background/70"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-bold text-foreground">{scenario.name}</p>
                                                {scenario.id === editingScenarioId && (
                                                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
                                                        In modifica
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                Aggiornato {formatSavedScenarioDate(scenario.updatedAt)} - {getIntestatarioLabel(scenario.intestatario, person1Name, person2Name)}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-border/70 bg-card/80 px-3 py-2 text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rate nuove</p>
                                            <p className="text-sm font-bold text-foreground">{formatEuro(totalInstallment)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                        <div className="rounded-xl bg-muted/30 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Card</p>
                                            <p className="mt-1 font-semibold text-foreground">
                                                {activeCount} attive su {scenario.simulations.length}
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-muted/30 px-3 py-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Capitale</p>
                                            <p className="mt-1 font-semibold text-foreground">{formatEuro(totalPrincipal)}</p>
                                        </div>
                                    </div>

                                    <p className="mt-3 text-[11px] text-muted-foreground">
                                        Intestatario:{" "}
                                        <span className="font-medium text-foreground">
                                            {scenario.intestatario === "person1"
                                                ? person1Name
                                                : scenario.intestatario === "person2"
                                                ? person2Name
                                                : "Entrambi"}
                                        </span>
                                        {" - "}
                                        {scenario.enableDebtReductionSimulation ? "leva anti-DTI salvata" : "nessuna riduzione debiti salvata"}
                                    </p>

                                    <div className="mt-3 rounded-2xl border border-border/60 bg-card/70 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            Specchio finanziamenti salvati
                                        </p>
                                        <div className="mt-3 space-y-2">
                                            {entries.map((entry, index) => (
                                                <div
                                                    key={`${scenario.id}-${index}-${entry.name}`}
                                                    className="rounded-xl bg-muted/30 px-3 py-2 text-xs"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="font-semibold text-foreground">{entry.name}</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {entry.duration} mesi - TAN {entry.rate.toFixed(2)}%
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-semibold text-foreground">
                                                                {entry.result.installment > 0 ? formatEuro(entry.result.installment) : "da completare"}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground">rata mensile</p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                                                        <span>Importo: <span className="font-medium text-foreground">{formatEuro(entry.importo)}</span></span>
                                                        <span>Anticipo: <span className="font-medium text-foreground">{formatEuro(entry.anticipo)}</span></span>
                                                        <span>Permuta: <span className="font-medium text-foreground">{formatEuro(entry.tradeInAmount)}</span></span>
                                                        <span>Capitale richiesto: <span className="font-medium text-foreground">{formatEuro(entry.principal)}</span></span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleLoadScenario(scenario)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/80 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/40"
                                        >
                                            <FolderOpen className="h-4 w-4 text-orange-500" />
                                            Riprendi
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteScenario(scenario.id)}
                                            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/80 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 dark:hover:border-red-900/70 dark:hover:bg-red-950/30"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Elimina
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                            Non hai ancora scenari salvati. Quando trovi una combinazione utile, assegnale un nome qui sopra e potrai riprenderla in qualsiasi momento.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <CardContent className="space-y-5 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-300">
                                <Layers3 className="h-3.5 w-3.5" />
                                Simulazioni in parallelo
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">Aggiungi anche un secondo finanziamento</h3>
                                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                    Puoi costruire piu scenari insieme e vedere sotto l&apos;impatto complessivo di tutte le rate simulate.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-right shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Attive ora</p>
                            <p className="text-base font-bold text-foreground">
                                {activeSimulationEntries.length} su {simulations.length}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{formatEuro(dtiData.totalNewInstallment)}/mese simulati</p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" /> Intestatario per l&apos;analisi generale
                        </Label>
                        <div className="flex gap-2">
                            {([
                                { value: "person1", label: person1Name },
                                { value: "person2", label: person2Name },
                                { value: "both", label: "Entrambi" },
                            ] as const).map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setIntestatario(option.value)}
                                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                                        intestatario === option.value
                                            ? "bg-orange-500 text-white shadow-sm"
                                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Questa selezione viene applicata al DTI complessivo, alle rate esistenti e alla sostenibilita finale.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {simulationEntries.map((simulation, index) => (
                    <Card key={simulation.id} className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                        <CardContent className="space-y-5 p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                                        {simulation.label}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground">
                                            {simulation.label}
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {simulation.principal > 0
                                                ? "La rata entra in automatico nell'analisi generale qui sotto."
                                                : "Compila i campi per includere questo scenario nel totale complessivo."}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {simulation.result.installment > 0 && (
                                        <div className="rounded-2xl border border-orange-200/80 bg-orange-50/80 px-4 py-3 text-right shadow-sm dark:border-orange-900/60 dark:bg-orange-950/25">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">Rata</p>
                                            <p className="text-lg font-extrabold text-orange-600 dark:text-orange-300">
                                                {formatEuro(simulation.result.installment)}
                                            </p>
                                        </div>
                                    )}
                                    {simulations.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeSimulation(simulation.id)}
                                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-900/70 dark:hover:bg-red-950/30"
                                            aria-label={`Rimuovi ${simulation.label}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Nome finanziamento</Label>
                                <Input
                                    value={simulation.name}
                                    onChange={(event) => updateSimulation(simulation.id, "name", event.target.value)}
                                    placeholder={index === 0 ? "Es. Auto principale" : `Es. Prestito extra ${index + 1}`}
                                    className="min-h-11 rounded-xl text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Euro className="h-3 w-3" /> Importo / Prezzo Totale
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="500"
                                        value={simulation.importo || ""}
                                        onChange={(event) =>
                                            updateSimulation(simulation.id, "importo", Math.max(0, Number(event.target.value) || 0))
                                        }
                                        className="min-h-11 rounded-xl text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Euro className="h-3 w-3" /> Anticipo in denaro
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="500"
                                        value={simulation.anticipo || ""}
                                        onChange={(event) =>
                                            updateSimulation(simulation.id, "anticipo", Math.max(0, Number(event.target.value) || 0))
                                        }
                                        className="min-h-11 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-foreground">Permuta</p>
                                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                                            Se consegni un bene usato, il suo valore si somma all&apos;anticipo e riduce il capitale da finanziare.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-medium text-muted-foreground">Attiva</span>
                                        <Switch
                                            checked={simulation.hasTradeIn}
                                            onCheckedChange={(checked) => updateSimulation(simulation.id, "hasTradeIn", checked)}
                                            className="data-[state=checked]:bg-orange-500"
                                        />
                                    </div>
                                </div>

                                {simulation.hasTradeIn && (
                                    <div className="mt-4 space-y-1.5">
                                        <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Euro className="h-3 w-3" /> Valore permuta
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="500"
                                            value={simulation.tradeInValue || ""}
                                            onChange={(event) =>
                                                updateSimulation(simulation.id, "tradeInValue", Math.max(0, Number(event.target.value) || 0))
                                            }
                                            className="min-h-11 rounded-xl bg-background/80 text-sm"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Percent className="h-3 w-3" /> Tasso Annuo (TAN)
                                        </Label>
                                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                            {simulation.tasso.toFixed(2)}%
                                        </span>
                                    </div>
                                    <Slider
                                        min={0}
                                        max={25}
                                        step={0.01}
                                        value={[simulation.tasso]}
                                        onValueChange={([value]) => updateSimulation(simulation.id, "tasso", value)}
                                        className="[&_[role=slider]]:bg-orange-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>0%</span>
                                        <span>25%</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" /> Durata
                                        </Label>
                                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                            {simulation.durata} mesi{simulation.durata >= 12 ? ` (${(simulation.durata / 12).toFixed(1)}a)` : ""}
                                        </span>
                                    </div>
                                    <Slider
                                        min={6}
                                        max={120}
                                        step={6}
                                        value={[simulation.durata]}
                                        onValueChange={([value]) => updateSimulation(simulation.id, "durata", value)}
                                        className="[&_[role=slider]]:bg-orange-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>6 mesi</span>
                                        <span>10 anni</span>
                                    </div>
                                </div>
                            </div>

                            {(simulation.anticipo > 0 || getTradeInAmount(simulation) > 0) && (
                                <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                    Capitale finanziato: <span className="font-semibold text-foreground">{formatEuro(simulation.principal)}</span>
                                    {" "}(importo {formatEuro(simulation.importo)} - anticipo {formatEuro(simulation.anticipo)}
                                    {simulation.hasTradeIn ? ` - permuta ${formatEuro(getTradeInAmount(simulation))}` : ""})
                                    <span className="ml-1">
                                        Apporto iniziale totale: <span className="font-semibold text-foreground">{formatEuro(getTotalUpfrontAmount(simulation))}</span>
                                    </span>
                                </p>
                            )}

                            {simulation.principal > 0 ? (
                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <div className="rounded-2xl border border-orange-200/80 bg-orange-50/70 px-4 py-3 dark:border-orange-900/60 dark:bg-orange-950/25">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Rata mensile</p>
                                        <p className="text-2xl font-extrabold tabular-nums text-orange-600 dark:text-orange-300">
                                            {formatEuro(simulation.result.installment)}
                                        </p>
                                        <p className="text-[10px] text-orange-400">per {simulation.durata} mesi</p>
                                    </div>
                                    <div className="rounded-2xl border border-red-200/80 bg-red-50/70 px-4 py-3 text-right dark:border-red-900/60 dark:bg-red-950/25">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Interessi totali</p>
                                        <p className="text-2xl font-extrabold tabular-nums text-red-600 dark:text-red-300">
                                            {formatEuro(simulation.result.totalInterest)}
                                        </p>
                                        <p className="text-[10px] text-red-400">costo del credito ({simulation.costoPct.toFixed(1)}%)</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                                    Questo blocco resta fuori dall&apos;analisi generale finche non inserisci un importo finanziato valido.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                <div className="relative flex justify-center py-2">
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-orange-200/80 dark:border-orange-900/60" />
                    <button
                        type="button"
                        onClick={addSimulation}
                        className="relative inline-flex items-center gap-3 rounded-full border border-orange-200/80 bg-white px-4 py-2 shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-orange-50 dark:border-orange-900/60 dark:bg-slate-950 dark:hover:bg-orange-950/20"
                    >
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm">
                            <Plus className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                            {simulations.length === 1 ? "Aggiungi un secondo finanziamento" : "Aggiungi un altro finanziamento"}
                        </span>
                    </button>
                </div>
            </div>

            {dtiData.hasIncome && activeSimulationEntries.length > 0 && (
                <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                    <CardContent className="space-y-4 p-5">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <h3 className="text-sm font-bold text-foreground">Analisi generale delle simulazioni</h3>
                            <span className="ml-auto rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {activeSimulationEntries.length} finanz. attiv{activeSimulationEntries.length === 1 ? "o" : "i"}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Reddito netto mensile</span>
                                <span className="font-semibold">{formatEuro(dtiData.income)}</span>
                            </div>

                            {dtiData.existingInstallment > 0 && !dtiData.hasSimulation && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>
                                        Rate esistenti ({dtiData.activeExistingCount} prestit{dtiData.activeExistingCount === 1 ? "o" : "i"} attiv{dtiData.activeExistingCount === 1 ? "o" : "i"})
                                    </span>
                                    <span>{formatEuro(dtiData.existingInstallment)}</span>
                                </div>
                            )}

                            {dtiData.hasSimulation && (
                                <>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Rate esistenti attuali ({dtiData.activeExistingCount} prestiti attivi)</span>
                                        <span>{formatEuro(dtiData.existingInstallment)}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                                        <span>- Riduzione simulata su {dtiData.simulatedLoanName}</span>
                                        <span>-{formatEuro(dtiData.simulatedMonthlySavings)}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Rate esistenti dopo il versamento</span>
                                        <span>{formatEuro(dtiData.adjustedExistingInstallment)}</span>
                                    </div>
                                </>
                            )}

                            {activeSimulationEntries.map((simulation) => (
                                <div key={simulation.id} className="flex justify-between text-muted-foreground">
                                    <span>+ {simulation.label}</span>
                                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                                        {formatEuro(simulation.result.installment)}
                                    </span>
                                </div>
                            ))}

                            <div className="flex justify-between border-t border-border/60 pt-2">
                                <span className="font-semibold text-foreground">Nuove rate simulate</span>
                                <span className="font-bold text-foreground">{formatEuro(dtiData.totalNewInstallment)}</span>
                            </div>

                            <div className="flex justify-between border-t border-border/60 pt-2 font-bold">
                                <span>Totale rate mensili</span>
                                <span>{formatEuro(dtiData.totalInstallment)}</span>
                            </div>

                            {dtiData.hasSimulation && (
                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                    <span>Prima del versamento simulato</span>
                                    <span>{formatEuro(dtiData.baselineTotalInstallment)}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 rounded-2xl border border-orange-200/70 bg-orange-50/50 p-4 dark:border-orange-900/60 dark:bg-orange-950/15">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500">Leva anti-DTI</p>
                                    <h4 className="text-sm font-semibold text-foreground">Simula estinzione anticipata o versamento extra</h4>
                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                        Riduciamo il debito residuo di un prestito gia attivo e ricalcoliamo il suo impatto prima di sommare tutte le nuove simulazioni.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium text-muted-foreground">Attiva</span>
                                    <Switch
                                        checked={enableDebtReductionSimulation}
                                        onCheckedChange={(checked) => setEnableDebtReductionSimulation(checked)}
                                        className="data-[state=checked]:bg-orange-500"
                                    />
                                </div>
                            </div>

                            {enableDebtReductionSimulation && activeLoanEntries.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-3 text-xs text-muted-foreground">
                                    Nessun prestito attivo idoneo per la simulazione in questo perimetro di intestatari.
                                </div>
                            )}

                            {enableDebtReductionSimulation && selectedLoanEntry && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Prestito / mutuo da ridurre</Label>
                                            <Select
                                                value={effectiveSelectedLoanId}
                                                onValueChange={(value) => {
                                                    setSelectedExistingLoanId(value);
                                                    setSelectedPrepaymentAmount(0);
                                                }}
                                            >
                                                <SelectTrigger className="min-h-11 rounded-xl bg-background/80">
                                                    <SelectValue placeholder="Seleziona un debito" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {activeLoanEntries.map(({ loan, snapshot }) => (
                                                        <SelectItem key={loan.id} value={loan.id}>
                                                            {loan.name} - {formatEuro(snapshot.currentInstallment)}/mese
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground">Versamento extra / estinzione parziale</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max={selectedLoanEntry.snapshot.remainingDebt}
                                                step={debtReductionSliderStep}
                                                value={clampedPrepaymentAmount || ""}
                                                onChange={(event) => setSelectedPrepaymentAmount(Math.max(0, Number(event.target.value) || 0))}
                                                className="min-h-11 rounded-xl bg-background/80 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                            <span>Debito residuo stimato: {formatEuro(selectedLoanEntry.snapshot.remainingDebt)}</span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPrepaymentAmount(selectedLoanEntry.snapshot.remainingDebt)}
                                                className="rounded-full border border-border/70 bg-background/80 px-3 py-1 font-semibold text-foreground transition-colors hover:bg-muted/50"
                                            >
                                                Estingui tutto
                                            </button>
                                        </div>

                                        <Slider
                                            min={0}
                                            max={Math.max(selectedLoanEntry.snapshot.remainingDebt, debtReductionSliderStep)}
                                            step={debtReductionSliderStep}
                                            value={[clampedPrepaymentAmount]}
                                            onValueChange={([value]) => setSelectedPrepaymentAmount(value)}
                                            className="[&_[role=slider]]:bg-orange-500"
                                        />

                                        <div className="flex flex-wrap gap-2">
                                            {[25, 50, 75, 100].map((percentage) => (
                                                <button
                                                    key={percentage}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedPrepaymentAmount((selectedLoanEntry.snapshot.remainingDebt * percentage) / 100)
                                                    }
                                                    className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/50"
                                                >
                                                    {percentage}%
                                                </button>
                                            ))}
                                            {suggestedPrepaymentForThreshold > 0 &&
                                                suggestedPrepaymentForThreshold < selectedLoanEntry.snapshot.remainingDebt && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedPrepaymentAmount(suggestedPrepaymentForThreshold)}
                                                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                    >
                                                        Portami al 33%: {formatEuro(suggestedPrepaymentForThreshold)}
                                                    </button>
                                                )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rata attuale</p>
                                            <p className="mt-1 text-base font-bold text-foreground">
                                                {formatEuro(selectedLoanEntry.snapshot.currentInstallment)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/25">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-300">
                                                Nuova rata stimata
                                            </p>
                                            <p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-300">
                                                {formatEuro(previewNewInstallment)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Debito dopo versamento</p>
                                            <p className="mt-1 text-base font-bold text-foreground">
                                                {formatEuro(debtReductionSimulation?.newRemainingDebt ?? selectedLoanEntry.snapshot.remainingDebt)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/80 p-3 dark:border-blue-900/60 dark:bg-blue-950/25">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-300">Riduzione rata</p>
                                            <p className="mt-1 text-base font-bold text-blue-700 dark:text-blue-300">
                                                {formatEuro(previewMonthlySavings)}
                                            </p>
                                        </div>
                                    </div>

                                    <p
                                        className={`text-xs leading-relaxed ${
                                            selectedLoanEntry.snapshot.recalculationMode === "estimate"
                                                ? "text-amber-700 dark:text-amber-300"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        {getRecalculationModeLabel(
                                            debtReductionSimulation?.recalculationMode ?? selectedLoanEntry.snapshot.recalculationMode,
                                        )}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Rapporto rata / reddito</span>
                                <span className={`font-bold ${dtiData.isOk ? "text-emerald-600" : dtiData.isWarning ? "text-amber-600" : "text-red-600"}`}>
                                    {dtiData.dtiPct.toFixed(1)}% su max 33%
                                    {dtiData.hasSimulation ? ` - prima ${dtiData.baselineDtiPct.toFixed(1)}%` : ""}
                                </span>
                            </div>

                            <div className="relative pt-7">
                                <div
                                    className="absolute top-0 z-30"
                                    style={{ left: getDtiPosition(dtiIndicatorValue), transform: dtiIndicatorTransform }}
                                >
                                    <div
                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold shadow-sm ${dtiAccentClasses.badge}`}
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        {dtiData.dtiPct.toFixed(1)}%
                                    </div>
                                </div>

                                <div className="relative h-4 overflow-hidden rounded-full bg-muted/60 shadow-inner ring-1 ring-black/5 dark:ring-white/10">
                                    {DTI_TRACK_SEGMENTS.map((segment) => (
                                        <div
                                            key={`${segment.start}-${segment.end}`}
                                            className={`absolute inset-y-0 ${segment.className}`}
                                            style={{
                                                left: getDtiPosition(segment.start),
                                                width: `${((segment.end - segment.start) / DTI_SCALE_MAX) * 100}%`,
                                            }}
                                        />
                                    ))}
                                    {DTI_MARKERS.filter((marker) => marker.value > 0 && marker.value < DTI_SCALE_MAX).map((marker) => (
                                        <div
                                            key={marker.value}
                                            className={`absolute inset-y-0 z-20 w-px ${marker.value === 33 ? "bg-emerald-500/80" : "bg-amber-500/80"}`}
                                            style={{ left: getDtiPosition(marker.value) }}
                                        />
                                    ))}
                                    <div
                                        className={`relative z-10 h-full rounded-full transition-all duration-300 ${dtiAccentClasses.fill}`}
                                        style={{ width: `${dtiProgressPct}%` }}
                                    />
                                    <div
                                        className={`absolute top-1/2 z-30 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-background shadow-sm ring-4 ${dtiAccentClasses.marker}`}
                                        style={{ left: getDtiPosition(dtiIndicatorValue), transform: "translate(-50%, -50%)" }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Area comfort</span>
                                <span>Attenzione</span>
                                <span>Critica</span>
                            </div>

                            <div className="relative h-4 text-[10px]">
                                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/70" />
                                {DTI_MARKERS.map((marker) => (
                                    <span
                                        key={marker.value}
                                        className={`absolute top-0 z-10 rounded-full bg-card px-1 ${marker.labelClassName}`}
                                        style={marker.style}
                                    >
                                        {marker.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div
                            className={`flex items-start gap-2.5 rounded-2xl p-3.5 text-xs ${
                                dtiData.isOk
                                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                    : dtiData.isWarning
                                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                                    : "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                            }`}
                        >
                            {dtiData.isOk ? (
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            ) : dtiData.isDanger ? (
                                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                            ) : (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            )}
                            <span>
                                {dtiData.hasSimulation
                                    ? dtiData.isOk
                                        ? `Con ${activeSimulationSummaryLabel} e il versamento simulato di ${formatEuro(dtiData.simulatedPrepayment)} su ${dtiData.simulatedLoanName}, il rapporto scende da ${dtiData.baselineDtiPct.toFixed(1)}% a ${dtiData.dtiPct.toFixed(1)}% e torna sotto la soglia del 33%.`
                                        : `Con ${activeSimulationSummaryLabel} e il versamento simulato di ${formatEuro(dtiData.simulatedPrepayment)} su ${dtiData.simulatedLoanName}, il rapporto migliora di ${dtiData.dtiImprovementPct.toFixed(1)} punti ma resta al ${dtiData.dtiPct.toFixed(1)}%.`
                                    : dtiData.isOk
                                    ? `Considerando ${activeSimulationSummaryLabel}, il rapporto rata/reddito e al ${dtiData.dtiPct.toFixed(1)}%, entro il limite del 33%.`
                                    : dtiData.isWarning
                                    ? `Considerando ${activeSimulationSummaryLabel}, il rapporto rata/reddito sale al ${dtiData.dtiPct.toFixed(1)}%, oltre il 33% consigliato.`
                                    : `Considerando ${activeSimulationSummaryLabel}, il rapporto rata/reddito raggiunge il ${dtiData.dtiPct.toFixed(1)}%, oltre il 40%.`}
                            </span>
                        </div>

                        {careerDtiAnalysis.current && careerDtiAnalysis.last && (
                            <div className="space-y-4 rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/15">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-2xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/70 dark:text-blue-300">
                                            <Briefcase className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-500">
                                                Carriera e timing
                                            </p>
                                            <h4 className="text-sm font-semibold text-foreground">
                                                Proiezione del rapporto rata/reddito con gli aumenti salvati
                                            </h4>
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                Uso la sezione Carriera per {getIntestatarioLabel(intestatario, person1Name, person2Name)}:
                                                aumenti annui, promozioni e redditi mensili aggiornano il margine futuro.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-blue-200/80 bg-background/80 px-3 py-2 text-right dark:border-blue-900/70">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Orizzonte</p>
                                        <p className="text-sm font-bold text-foreground">
                                            {careerIncomeProjection.progression.yearsToSimulate} anni
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reddito oggi</p>
                                        <p className="mt-1 text-base font-bold text-foreground">
                                            {formatEuro(careerDtiAnalysis.current.monthlyIncome)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            DTI {careerDtiAnalysis.current.dtiPct.toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gap oggi</p>
                                        <p className={`mt-1 text-base font-bold ${careerDtiAnalysis.currentGap > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                            {careerDtiAnalysis.currentGap > 0 ? formatEuro(careerDtiAnalysis.currentGap) : "0 EUR"}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">margine mancante al 33%</p>
                                    </div>
                                    <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primo anno utile</p>
                                        <p className="mt-1 text-base font-bold text-foreground">
                                            {dtiData.isOk
                                                ? "Gia ora"
                                                : careerDtiAnalysis.firstFutureFit
                                                ? String(careerDtiAnalysis.firstFutureFit.year)
                                                : "Non stimato"}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {dtiData.isOk
                                                ? "scenario entro soglia"
                                                : careerDtiAnalysis.firstFutureFit
                                                ? formatWaitLabel(careerDtiAnalysis.firstFutureFit.yearOffset)
                                                : "oltre orizzonte carriera"}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-border/70 bg-background/80 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fine proiezione</p>
                                        <p className="mt-1 text-base font-bold text-foreground">
                                            {formatEuro(careerDtiAnalysis.last.monthlyIncome)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            DTI {careerDtiAnalysis.last.dtiPct.toFixed(1)}%
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className={`flex items-start gap-2.5 rounded-2xl p-3 text-xs ${
                                        dtiData.isOk
                                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                            : careerDtiAnalysis.firstFutureFit
                                            ? "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                                            : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                                    }`}
                                >
                                    {dtiData.isOk ? (
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                    ) : careerDtiAnalysis.firstFutureFit ? (
                                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                    ) : (
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                    )}
                                    <span>
                                        {dtiData.isOk
                                            ? `Lo scenario e gia sostenibile oggi. Con gli aumenti salvati, a fine proiezione il margine sulle nuove rate arriverebbe a ${formatEuro(Math.max(0, careerDtiAnalysis.last.maxNewInstallment - dtiData.totalNewInstallment))}.`
                                            : careerDtiAnalysis.firstFutureFit
                                            ? `Oggi mancano circa ${formatEuro(careerDtiAnalysis.currentGap)} di capacita mensile al 33%. Con la carriera salvata, lo scenario rientrerebbe nel ${careerDtiAnalysis.firstFutureFit.year}, ${formatWaitLabel(careerDtiAnalysis.firstFutureFit.yearOffset)}, con DTI stimato al ${careerDtiAnalysis.firstFutureFit.dtiPct.toFixed(1)}%.`
                                            : `Con gli aumenti salvati lo scenario non rientra entro ${careerIncomeProjection.progression.yearsToSimulate} anni: a fine proiezione il margine stimato resta ${formatEuro(careerDtiAnalysis.last.margin)} rispetto alle nuove rate.`}
                                    </span>
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/80">
                                    <div className="grid grid-cols-4 gap-2 border-b border-border/70 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        <span>Anno</span>
                                        <span>Reddito/mese</span>
                                        <span>DTI</span>
                                        <span>Esito</span>
                                    </div>
                                    <div className="divide-y divide-border/60">
                                        {careerDtiAnalysis.previewRows.map((row) => (
                                            <div key={row.year} className="grid grid-cols-4 gap-2 px-3 py-2 text-xs">
                                                <div>
                                                    <p className="font-semibold text-foreground">{row.year}</p>
                                                    <p className="text-[10px] text-muted-foreground">{formatWaitLabel(row.yearOffset)}</p>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground">{formatEuro(row.monthlyIncome)}</p>
                                                    {row.promotionAmount > 0 && (
                                                        <p className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-300">
                                                            <ArrowUpRight className="h-3 w-3" />
                                                            promo {formatEuro(row.promotionAmount)}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`font-semibold ${row.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                                        {row.dtiPct.toFixed(1)}%
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        max nuove {formatEuro(row.maxNewInstallment)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center">
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                                            row.margin >= 0
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                                                : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                                        }`}
                                                    >
                                                        {row.margin >= 0 ? `ok +${formatEuro(row.margin)}` : `manca ${formatEuro(Math.abs(row.margin))}`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Rata massima aggiuntiva sostenibile al 33%{dtiData.hasSimulation ? " dopo il versamento" : ""}:{" "}
                            <span className={`font-semibold ${dtiData.maxNewInstallment > 0 ? "text-foreground" : "text-red-500"}`}>
                                {dtiData.maxNewInstallment > 0 ? formatEuro(dtiData.maxNewInstallment) : "soglia gia superata dalle rate esistenti"}
                            </span>
                            {dtiData.hasSimulation && (
                                <span className="ml-1 text-muted-foreground">
                                    (prima {dtiData.baselineMaxNewInstallment > 0 ? formatEuro(dtiData.baselineMaxNewInstallment) : "0 EUR"})
                                </span>
                            )}
                        </p>
                    </CardContent>
                </Card>
            )}

            {activeSimulationEntries.length > 0 && (
                <>
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                        <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Nuove Rate Simulate</p>
                            <p className="mt-1 text-lg font-extrabold text-orange-600 dark:text-orange-300">{formatEuro(dtiData.totalNewInstallment)}</p>
                            <p className="mt-0.5 text-[10px] text-orange-400">
                                {activeSimulationEntries.length} finanziament{activeSimulationEntries.length === 1 ? "o" : "i"} attiv{activeSimulationEntries.length === 1 ? "o" : "i"}
                            </p>
                        </div>
                        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Totale Pagato</p>
                            <p className="mt-1 text-lg font-extrabold text-blue-600 dark:text-blue-300">{formatEuro(aggregateResult.totalPaid)}</p>
                            <p className="mt-0.5 text-[10px] text-blue-400">capitale + interessi</p>
                        </div>
                        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Interessi Totali</p>
                            <p className="mt-1 text-lg font-extrabold text-red-600 dark:text-red-300">{formatEuro(aggregateResult.totalInterest)}</p>
                            <p className="mt-0.5 text-[10px] text-red-400">sommati su tutte le simulazioni</p>
                        </div>
                        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">% Costo Credito</p>
                            <p className="mt-1 text-lg font-extrabold text-rose-600 dark:text-rose-300">{aggregateCostPct.toFixed(1)}%</p>
                            <p className="mt-0.5 text-[10px] text-rose-400">sul capitale totale simulato</p>
                        </div>
                    </div>

                    {aggregateResult.chartData.length > 0 && (
                        <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                            <CardContent className="p-5">
                                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-muted-foreground">Piano di Rimborso Complessivo</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Somma anno per anno di tutte le simulazioni attive in questo momento.
                                        </p>
                                    </div>
                                    <span className="text-[11px] font-semibold text-muted-foreground">
                                        Orizzonte massimo: {aggregateResult.schedule.length} mesi
                                    </span>
                                </div>

                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={aggregateResult.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                                            <YAxis
                                                yAxisId="bars"
                                                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                                tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
                                            />
                                            <YAxis
                                                yAxisId="line"
                                                orientation="right"
                                                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                                tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
                                            />
                                            <Tooltip
                                                formatter={(value: number | string | undefined, name?: string) => [
                                                    formatEuro(Number(value ?? 0)),
                                                    name ?? "Valore",
                                                ]}
                                                contentStyle={{
                                                    borderRadius: "16px",
                                                    border: "1px solid var(--border)",
                                                    backgroundColor: "var(--popover)",
                                                    color: "var(--popover-foreground)",
                                                    boxShadow: "0 16px 40px -16px rgba(15,23,42,0.45)",
                                                }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                                            <Bar yAxisId="bars" dataKey="Capitale" stackId="a" fill="#3b82f6" fillOpacity={0.85} radius={[0, 0, 4, 4]} />
                                            <Bar yAxisId="bars" dataKey="Interessi" stackId="a" fill="#ef4444" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
                                            <Line yAxisId="line" type="monotone" dataKey="Debito Residuo" stroke="#f97316" strokeWidth={2} dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>

                                <p className="mt-3 text-center text-[10px] text-muted-foreground">
                                    <span className="mr-1 inline-block h-2 w-3 rounded bg-blue-500" /> Quota capitale{" "}
                                    <span className="mr-1 inline-block h-2 w-3 rounded bg-red-500" /> Quota interessi{" "}
                                    <span className="font-semibold text-orange-500">- Debito residuo</span> (asse dx)
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {aggregateResult.schedule.length > 0 && (
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowOverallTable((current) => !current)}
                                className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card/80 px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/40"
                            >
                                <span className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-orange-500" />
                                    Piano di ammortamento complessivo ({aggregateResult.schedule.length} mesi)
                                </span>
                                {showOverallTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>

                            {showOverallTable && (
                                <Card className="mt-2 rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                                    <CardContent className="p-0">
                                        <div className="max-h-96 overflow-auto rounded-3xl">
                                            <table className="w-full text-xs">
                                                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                                                    <tr>
                                                        {["Mese", "Rata", "Q. Capitale", "Q. Interessi", "Debito Residuo"].map((heading) => (
                                                            <th key={heading} className="px-4 py-3 text-left font-semibold text-muted-foreground">
                                                                {heading}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {aggregateResult.schedule.map((row, index) => (
                                                        <tr key={row.mese} className={index % 2 === 0 ? "bg-transparent" : "bg-muted/20"}>
                                                            <td className="px-4 py-2 font-medium">{row.mese}</td>
                                                            <td className="px-4 py-2">{formatEuro(row.rata)}</td>
                                                            <td className="px-4 py-2 text-blue-600 dark:text-blue-400">{formatEuro(row.capitale)}</td>
                                                            <td className="px-4 py-2 text-red-500 dark:text-red-400">{formatEuro(row.interessi)}</td>
                                                            <td className="px-4 py-2 font-semibold">{formatEuro(row.debito)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </>
            )}

            <div className="space-y-2 rounded-3xl border border-orange-200 bg-orange-50/90 p-5 text-sm dark:border-orange-800 dark:bg-orange-950/20">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">Come funziona</p>
                <ul className="list-inside list-disc space-y-1 text-xs text-orange-700 dark:text-orange-400">
                    <li>Ogni simulazione usa ammortamento alla francese e puo essere sommata alle altre.</li>
                    <li>Puoi dare un nome a ogni finanziamento e usare la permuta come valore aggiuntivo all&apos;anticipo.</li>
                    <li>Le nuove rate vengono aggregate nel DTI insieme ai prestiti gia esistenti.</li>
                    <li>La leva anti-DTI ricalcola prima un debito attivo, poi aggiorna l&apos;analisi complessiva.</li>
                    <li>La proiezione Carriera usa aumenti annui e promozioni salvate per stimare quando il DTI puo rientrare.</li>
                    <li>Puoi salvare uno scenario completo e riprenderlo piu avanti per modificarlo o duplicarlo.</li>
                    <li>Aumentare anticipo o ridurre importo, durata e tasso su ogni card cambia il totale generale in tempo reale.</li>
                </ul>
            </div>
        </div>
    );
}
