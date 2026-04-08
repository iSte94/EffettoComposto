"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Landmark, Loader2, CheckCircle, Save, FolderOpen, Trash2, Upload, Download } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { usePreferences, type MortgagePreferences } from "@/hooks/usePreferences";
import { getInstallmentAmountForMonth } from "@/lib/finance/loans";
import { exportAmortizationCSV } from "@/lib/export/csv";
import { Button } from "@/components/ui/button";
import type { ExistingLoan } from "@/types";
import { formatEuro } from "@/lib/format";
import { MortgageInputs } from "./mortgage-inputs";
import { DtiAnalysis } from "./dti-analysis";
import { ProfitabilityAnalysis } from "./profitability-analysis";
import { MortgageComparison } from "./mortgage-comparison";

// ── Salvataggio / Caricamento ───────────────────────────────────────────

interface MortgageSaveData {
    preferences: MortgagePreferences;
}

interface MortgageSaveEntry {
    name: string;
    date: string;
    data: MortgageSaveData;
}

const MORTGAGE_STORAGE_KEY = "fi_mortgage_simulator_saves";

function loadMortgageSaves(): MortgageSaveEntry[] {
    try {
        const raw = localStorage.getItem(MORTGAGE_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function persistMortgageSaves(saves: MortgageSaveEntry[]) {
    localStorage.setItem(MORTGAGE_STORAGE_KEY, JSON.stringify(saves));
}

export function MortgageSimulator() {
    const { user } = useAuth();
    const { preferences, isSaving, updatePreference, updatePreferences } = usePreferences();

    // ── Salvataggio / Caricamento ──
    const [saves, setSaves] = useState<MortgageSaveEntry[]>(() => loadMortgageSaves());
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    const handleSave = useCallback(() => {
        const name = saveName.trim();
        if (!name) return;
        const entry: MortgageSaveEntry = {
            name,
            date: new Date().toISOString(),
            data: { preferences },
        };
        const updated = [...saves.filter(s => s.name !== name), entry];
        persistMortgageSaves(updated);
        setSaves(updated);
        setSaveName("");
        setShowSaveDialog(false);
        setSaveMessage(`"${name}" salvato`);
        setTimeout(() => setSaveMessage(null), 2500);
    }, [saveName, preferences, saves]);

    const handleLoad = useCallback((entry: MortgageSaveEntry) => {
        updatePreferences(entry.data.preferences);
        setShowLoadDialog(false);
        setSaveMessage(`"${entry.name}" caricato`);
        setTimeout(() => setSaveMessage(null), 2500);
    }, [updatePreferences]);

    const handleDelete = useCallback((name: string) => {
        const updated = saves.filter(s => s.name !== name);
        persistMortgageSaves(updated);
        setSaves(updated);
    }, [saves]);

    const handleExport = useCallback(() => {
        const data: MortgageSaveData = { preferences };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mutuo-simulazione.json";
        a.click();
        URL.revokeObjectURL(url);
    }, [preferences]);

    const handleImport = useCallback(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const d = JSON.parse(ev.target?.result as string) as MortgageSaveData;
                    if (d.preferences) {
                        updatePreferences(d.preferences);
                        setSaveMessage("File importato");
                        setTimeout(() => setSaveMessage(null), 2500);
                    }
                } catch {
                    setSaveMessage("File non valido");
                    setTimeout(() => setSaveMessage(null), 2500);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }, [updatePreferences]);

    const existingLoans: ExistingLoan[] = useMemo(() => {
        try {
            return JSON.parse(preferences.existingLoansList);
        } catch {
            return [];
        }
    }, [preferences.existingLoansList]);

    // Calcoli derivati
    const calculations = useMemo(() => {
        const { propertyPrice, downpayment, purchaseTaxes, notaryFees, agencyFees,
            netIncome, rate, years, expectedRent, maintenanceTaxes,
            marketReturn, vacancyRate, rentInflation, extraMaintenance } = preferences;

        // Rata prestiti esistenti
        let calculatedExistingInstallment = 0;
        if (existingLoans.length > 0) {
            calculatedExistingInstallment = existingLoans.reduce((acc, loan) => {
                if (!loan.startDate || !loan.endDate) return acc + (Number(loan.installment) || 0);
                const start = new Date(loan.startDate + "-01");
                const end = new Date(loan.endDate + "-01");
                const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                const now = new Date();
                const currentMonthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                return acc + getInstallmentAmountForMonth(loan, currentMonthsPassed, totalMonths, currentMonthsPassed);
            }, 0);
        }

        const loanAmount = propertyPrice - downpayment;
        const ancillaryCosts = purchaseTaxes + notaryFees + agencyFees;
        const totalCashNeeded = downpayment + ancillaryCosts;

        const monthlyRate = (rate / 100) / 12;
        const numPayments = years * 12;
        const mortgagePayment = loanAmount > 0
            ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
            : 0;

        const totalPaymentsMade = mortgagePayment * numPayments;
        const totalInterestPaid = Math.max(0, totalPaymentsMade - loanAmount);

        const totalMonthlyDebt = mortgagePayment + calculatedExistingInstallment;
        const maxInstallment = netIncome * 0.33;
        const maxNewMortgageAllowed = Math.max(0, maxInstallment - calculatedExistingInstallment);
        const sustainabilityRatio = netIncome > 0 ? (totalMonthlyDebt / netIncome) * 100 : 0;

        const netRent = expectedRent - maintenanceTaxes;
        const cashflow = netRent - mortgagePayment;
        const grossYield = propertyPrice > 0 ? (expectedRent * 12 / propertyPrice) * 100 : 0;
        const totalAcquisitionCost = propertyPrice + ancillaryCosts;
        const netYield = totalAcquisitionCost > 0 ? (netRent * 12 / totalAcquisitionCost) * 100 : 0;

        const totalSunkCosts = totalCashNeeded + totalInterestPaid + extraMaintenance;
        let totalRentCollected = 0;
        let currentYearRent = netRent * 12;
        for (let i = 0; i < years; i++) {
            totalRentCollected += currentYearRent * (1 - vacancyRate / 100);
            currentYearRent *= (1 + rentInflation / 100);
        }
        const pureRealEstateProfit = totalRentCollected - totalSunkCosts;

        const investFutureValue = totalCashNeeded * Math.pow(1 + marketReturn / 100, years);
        const propertyFutureValue = propertyPrice * Math.pow(1.02, years);

        return {
            calculatedExistingInstallment, loanAmount, totalCashNeeded,
            mortgagePayment, totalInterestPaid, totalMonthlyDebt,
            maxInstallment, maxNewMortgageAllowed, sustainabilityRatio,
            cashflow, grossYield, netYield,
            totalRentCollected, pureRealEstateProfit,
            investFutureValue, propertyFutureValue,
        };
    }, [preferences, existingLoans]);

    return (
        <div className="space-y-12 animate-in fade-in-50 duration-500">
            <div className="text-center space-y-4 pt-4 pb-6 relative">
                <div className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/75 mb-2">
                    <Landmark className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center justify-center gap-3">
                    Analisi Immobiliare <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Pro</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                    Calcola la sostenibilità bancaria includendo i tuoi finanziamenti attivi, e analizza i rendimenti incrociati degli affitti per capire se e quanto ci guadagnerai.
                </p>

                {user && (
                    <div className="absolute right-4 top-0 flex h-8 items-center rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                        {isSaving ? (
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center">
                                <Loader2 className="w-3 h-3 mr-1.5 animate-spin text-slate-400" /> Salvataggio...
                            </span>
                        ) : (
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center animate-in fade-in">
                                <CheckCircle className="w-3 h-3 mr-1.5" /> Dati salvati
                            </span>
                        )}
                    </div>
                )}

                {!user && (
                    <div className="pt-2 flex justify-center">
                        <span className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 border border-blue-200 px-4 py-1.5 rounded-full font-medium">
                            Effettua l&apos;accesso per salvare le tue simulazioni
                        </span>
                    </div>
                )}

                {/* Barra Salvataggio */}
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                        onClick={() => setShowSaveDialog(true)}>
                        <Save className="w-3.5 h-3.5" /> Salva
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                        onClick={() => setShowLoadDialog(true)}
                        disabled={saves.length === 0}>
                        <FolderOpen className="w-3.5 h-3.5" /> Carica{saves.length > 0 && ` (${saves.length})`}
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                        onClick={handleExport}>
                        <Download className="w-3.5 h-3.5" /> Esporta
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5"
                        onClick={handleImport}>
                        <Upload className="w-3.5 h-3.5" /> Importa
                    </Button>
                </div>

                {/* Messaggio feedback */}
                {saveMessage && (
                    <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in-50 duration-300">
                        {saveMessage}
                    </div>
                )}
            </div>

            {/* Dialog Salvataggio */}
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Salva Configurazione</DialogTitle>
                        <DialogDescription>
                            Dai un nome a questa configurazione per ritrovarla in seguito.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Input
                            placeholder="Nome configurazione (es. Casa Milano)"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                            autoFocus
                        />
                        {saves.some(s => s.name === saveName.trim()) && saveName.trim() && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                Esiste già un salvataggio con questo nome: verrà sovrascritto.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Annulla</Button>
                        <Button onClick={handleSave} disabled={!saveName.trim()}>
                            <Save className="w-4 h-4 mr-1.5" /> Salva
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Caricamento */}
            <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Carica Configurazione</DialogTitle>
                        <DialogDescription>
                            Seleziona una configurazione salvata per ripristinarla.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
                        {saves.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Nessun salvataggio trovato</p>
                        ) : (
                            saves
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((entry) => (
                                    <div key={entry.name}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                        <button
                                            className="flex-1 text-left"
                                            onClick={() => handleLoad(entry)}>
                                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                                {entry.name}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {new Date(entry.date).toLocaleString("it-IT", {
                                                    day: "2-digit", month: "short", year: "numeric",
                                                    hour: "2-digit", minute: "2-digit",
                                                })}
                                                {" — "}Immobile €{entry.data.preferences.propertyPrice.toLocaleString("it-IT")}
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(entry.name)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                            title="Elimina">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                <MortgageInputs preferences={preferences} onUpdate={updatePreference} />

                <div className="lg:col-span-12 xl:col-span-7">
                    <div className="space-y-8 lg:sticky lg:top-8">
                        <div className="flex items-center justify-between rounded-3xl border border-slate-200/80 bg-white/75 px-4 py-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:px-8">
                            <div className="space-y-1">
                                <div className="text-slate-600 dark:text-slate-400 font-bold text-sm">Disponibilità Liquida Necessaria Subito</div>
                                <div className="text-xs text-slate-500">Anticipo immobile + Spese Notarili, Tasse e Agenzia</div>
                            </div>
                            <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">{formatEuro(calculations.totalCashNeeded)}</div>
                        </div>

                        <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-2xl backdrop-blur-3xl dark:border-slate-800 dark:bg-slate-900/75">
                            <CardContent className="p-2 md:p-4">
                                <Tabs defaultValue="mortgage" className="w-full">
                                    <TabsList className="mb-6 grid w-full grid-cols-3 rounded-2xl bg-slate-100/80 p-1.5 dark:bg-slate-800/80">
                                        <TabsTrigger value="mortgage" className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:text-slate-100 text-slate-500 font-semibold transition-all text-xs md:text-sm">
                                            Rata/Reddito
                                        </TabsTrigger>
                                        <TabsTrigger value="invest" className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:text-slate-100 text-slate-500 font-semibold transition-all text-xs md:text-sm">
                                            Profittabilità
                                        </TabsTrigger>
                                        <TabsTrigger value="compare" className="rounded-2xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:text-slate-100 text-slate-500 font-semibold transition-all text-xs md:text-sm">
                                            Confronto
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="px-4 pb-10 pt-4 md:px-8">
                                        <TabsContent value="mortgage" className="animate-in fade-in-50 duration-500">
                                            <DtiAnalysis
                                                mortgagePayment={calculations.mortgagePayment}
                                                loanAmount={calculations.loanAmount}
                                                totalMonthlyDebt={calculations.totalMonthlyDebt}
                                                calculatedExistingInstallment={calculations.calculatedExistingInstallment}
                                                sustainabilityRatio={calculations.sustainabilityRatio}
                                                maxInstallment={calculations.maxInstallment}
                                                maxNewMortgageAllowed={calculations.maxNewMortgageAllowed}
                                            />
                                        </TabsContent>

                                        <TabsContent value="invest" className="animate-in fade-in-50 duration-500">
                                            <ProfitabilityAnalysis
                                                grossYield={calculations.grossYield}
                                                netYield={calculations.netYield}
                                                cashflow={calculations.cashflow}
                                                years={preferences.years}
                                                rentInflation={preferences.rentInflation}
                                                vacancyRate={preferences.vacancyRate}
                                                totalRentCollected={calculations.totalRentCollected}
                                                totalCashNeeded={calculations.totalCashNeeded}
                                                totalInterestPaid={calculations.totalInterestPaid}
                                                extraMaintenance={preferences.extraMaintenance}
                                                pureRealEstateProfit={calculations.pureRealEstateProfit}
                                                propertyFutureValue={calculations.propertyFutureValue}
                                                investFutureValue={calculations.investFutureValue}
                                                marketReturn={preferences.marketReturn}
                                            />
                                        </TabsContent>

                                        <TabsContent value="compare" className="animate-in fade-in-50 duration-500">
                                            <MortgageComparison />
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Export Button */}
                        {calculations.loanAmount > 0 && (
                            <div className="flex justify-end mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl text-xs flex items-center"
                                    onClick={() => exportAmortizationCSV({
                                        loanAmount: calculations.loanAmount,
                                        rate: preferences.rate,
                                        years: preferences.years,
                                    })}
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" /> Esporta Piano Ammortamento CSV
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
