"use client";

import { lazy, Suspense, useState } from "react";
import { InflationCalculator } from "@/components/inflation-calculator";
import { CompoundInterestCalculator } from "@/components/compound-interest-calculator";
import { DirectaMovementsViewer } from "@/components/directa-movements-viewer";
import { LoanCalculator } from "@/components/loan-calculator";
import { Car, ChevronDown, ChevronUp, Loader2, Sparkles, Wrench } from "lucide-react";

const ThermalToElectricCarCalculator = lazy(() =>
    import("@/components/thermal-to-electric-car-calculator").then((m) => ({
        default: m.ThermalToElectricCarCalculator,
    })),
);

export function CalculatorsDashboard() {
    const [showNicheTools, setShowNicheTools] = useState(false);

    return (
        <div className="space-y-8">
            <div className="text-center space-y-3 pb-4">
                <div className="inline-flex items-center gap-3 px-4 sm:px-5 py-2.5 bg-teal-50/80 dark:bg-teal-950/35 border border-teal-200/80 dark:border-teal-900/70 rounded-2xl shadow-sm">
                    <Wrench className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Strumenti</h2>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">Calcolatori finanziari e analisi movimenti dal tuo broker.</p>
            </div>

            <DirectaMovementsViewer />
            <LoanCalculator />
            <InflationCalculator />
            <CompoundInterestCalculator />

            <div className="rounded-[2rem] border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <button
                    type="button"
                    onClick={() => setShowNicheTools((value) => !value)}
                    className="flex w-full flex-col gap-4 p-5 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
                >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                                Vari calcolatori
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Strumenti di nicchia, fuori dal flusso principale</h3>
                                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                    Qui teniamo i comparatori piu verticali. Il primo e dedicato a chi sta valutando il salto dalla propria auto termica a una Tesla elettrica.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-right shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sezione</p>
                                <p className="text-sm font-semibold text-foreground">
                                    {showNicheTools ? "Aperta" : "Nascosta"} • 1 tool
                                </p>
                            </div>
                            <div className="rounded-full border border-border/70 bg-background/80 p-3 shadow-sm">
                                {showNicheTools ? <ChevronUp className="h-5 w-5 text-foreground" /> : <ChevronDown className="h-5 w-5 text-foreground" />}
                            </div>
                        </div>
                    </div>
                </button>

                {showNicheTools && (
                    <div className="space-y-6 border-t border-border/70 px-5 pb-5 pt-2 sm:px-6 sm:pb-6">
                        <div className="rounded-[1.75rem] border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-sm dark:border-teal-900/60 dark:from-teal-950/20 dark:via-card dark:to-cyan-950/20">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-2">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                                        <Car className="h-3.5 w-3.5" />
                                        Da auto termica a elettrica
                                    </div>
                                    <h4 className="text-lg font-bold text-foreground">Vendi la benzina o no?</h4>
                                    <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                        Confronta tenere l&apos;auto attuale contro passare a una Tesla nuova considerando consumi, assicurazione, manutenzione, svalutazione e ricarica a casa o fuori.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-teal-200 bg-white/90 px-4 py-3 text-right shadow-sm dark:border-teal-900/70 dark:bg-teal-950/25">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-300">Tool attivo</p>
                                    <p className="text-sm font-semibold text-teal-700 dark:text-teal-200">Comparatore completo</p>
                                </div>
                            </div>
                        </div>

                        <Suspense
                            fallback={
                                <div className="flex items-center justify-center rounded-[2rem] border border-border/70 bg-card/70 py-20 shadow-sm backdrop-blur-sm">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            }
                        >
                            <ThermalToElectricCarCalculator />
                        </Suspense>
                    </div>
                )}
            </div>
        </div>
    );
}
