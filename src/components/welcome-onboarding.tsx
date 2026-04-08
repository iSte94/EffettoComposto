"use client";

import { BarChart3, LineChart, Landmark, Flame, TrendingDown, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

interface WelcomeOnboardingProps {
    onNavigate?: (tab: string) => void;
}

const FEATURES = [
    {
        icon: <BarChart3 className="w-5 h-5" />,
        title: "Riepilogo",
        description: "Patrimonio netto, KPI finanziari e obiettivi di risparmio in un colpo d&apos;occhio",
        color: "text-teal-500",
        bg: "bg-teal-50 dark:bg-teal-950/30",
        tab: "overview",
    },
    {
        icon: <LineChart className="w-5 h-5" />,
        title: "Patrimonio",
        description: "Traccia immobili, azioni, crypto, fondi pensione e debiti nel tempo",
        color: "text-blue-500",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        tab: "patrimonio",
    },
    {
        icon: <ShieldCheck className="w-5 h-5" />,
        title: "Consulente",
        description: "Simula acquisti importanti e ricevi analisi con consigli personalizzati",
        color: "text-indigo-500",
        bg: "bg-indigo-50 dark:bg-indigo-950/30",
        tab: "advisor",
    },
    {
        icon: <Landmark className="w-5 h-5" />,
        title: "Mutuo",
        description: "Calcola rata, DTI, confronta offerte e analizza la profittabilita&apos;",
        color: "text-slate-600",
        bg: "bg-slate-50 dark:bg-slate-800/50",
        tab: "simulator",
    },
    {
        icon: <Flame className="w-5 h-5" />,
        title: "FIRE",
        description: "Simulazione Monte Carlo con 10.000 scenari per la tua indipendenza finanziaria",
        color: "text-orange-500",
        bg: "bg-orange-50 dark:bg-orange-950/30",
        tab: "fire",
    },
    {
        icon: <TrendingDown className="w-5 h-5" />,
        title: "Inflazione",
        description: "Calcola l&apos;erosione del potere d&apos;acquisto e il rendimento reale",
        color: "text-red-500",
        bg: "bg-red-50 dark:bg-red-950/30",
        tab: "inflation",
    },
];

const STEPS = [
    { step: "1", text: "Registrati o accedi per salvare i tuoi dati" },
    { step: "2", text: "Inserisci il tuo patrimonio nel tab Patrimonio" },
    { step: "3", text: "Esplora i tab per analizzare le tue finanze" },
];

export function WelcomeOnboarding({ onNavigate }: WelcomeOnboardingProps) {
    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Hero */}
            <div className="text-center space-y-4 pt-8">
                <div className="flex justify-center">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-2xl">
                        <Sparkles className="w-10 h-10 text-blue-500" />
                    </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    Benvenuto in <span className="text-blue-600 dark:text-blue-400">FI</span>
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                    Il tuo calcolatore immobiliare e finanziario completo. Gestisci mutuo, patrimonio, FIRE e molto altro.
                </p>
            </div>

            {/* Quick Start Steps */}
            <div className="flex justify-center">
                <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                    {STEPS.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                                {s.step}
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{s.text}</span>
                            {i < STEPS.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 hidden md:block" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {FEATURES.map((f) => (
                    <button
                        key={f.tab}
                        onClick={() => onNavigate?.(f.tab)}
                        className={`${f.bg} rounded-2xl p-5 text-left transition-all hover:shadow-md hover:scale-[1.02] border border-transparent hover:border-slate-200 dark:hover:border-slate-700`}
                    >
                        <div className={`${f.color} mb-3`}>{f.icon}</div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{f.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
