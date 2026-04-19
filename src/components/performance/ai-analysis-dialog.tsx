"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AlertTriangle, Brain, Check, Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAiSettings } from "@/hooks/useAiSettings";

interface PerformanceMetricsLite {
    startDate: string;
    endDate: string;
    months: number;
    startNetWorth: number;
    endNetWorth: number;
    totalCashFlow: number;
    roi: number | null;
    cagr: number | null;
    twr: number | null;
    mwr: number | null;
    volatility: number | null;
    sharpeRatio: number | null;
    maxDrawdown: number | null;
    maxDrawdownDate: string | null;
    drawdownDurationMonths: number | null;
    recoveryMonths: number | null;
    currentDrawdown: number | null;
}

interface Props {
    trigger?: React.ReactNode;
    period: string;
    metrics: PerformanceMetricsLite | null;
    monthlyReturns: { ym: string; returnPct: number }[];
    underwaterSeries: { date: string; drawdown: number }[];
}

export const AiPerformanceAnalysisDialog = memo(function AiPerformanceAnalysisDialog({
    trigger,
    period,
    metrics,
    monthlyReturns,
    underwaterSeries,
}: Props) {
    const { settings, loaded } = useAiSettings();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const hasRun = useRef(false);

    const isConfigured = loaded && settings.hasStoredKey && !!settings.model;

    const run = async () => {
        if (!metrics) {
            setError("Metriche non disponibili");
            return;
        }
        if (!isConfigured) {
            setError("Configura provider AI e chiave server-side nella tab AI -> Config");
            return;
        }

        setLoading(true);
        setAnalysis("");
        setError(null);

        try {
            const res = await fetch("/api/ai/performance-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    period,
                    metrics,
                    monthlyReturns,
                    underwaterSeries,
                }),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(json.error || "Errore analisi AI");
            }

            setAnalysis(json.analysis || "(nessuna risposta)");
        } catch (e) {
            setError((e as Error).message.slice(0, 300));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && !hasRun.current && isConfigured && metrics) {
            hasRun.current = true;
            void run();
        }
        if (!open) {
            hasRun.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isConfigured, metrics]);

    const copyToClipboard = async () => {
        if (!analysis) return;
        try {
            await navigator.clipboard.writeText(analysis);
            setCopied(true);
            toast.success("Analisi copiata");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Impossibile copiare");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button variant="outline" size="sm" className="rounded-full gap-1.5 border-purple-400/50 bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 dark:text-purple-300">
                        <Sparkles className="h-3.5 w-3.5" /> Analizza con AI
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden rounded-3xl border-border/70 bg-card/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Brain className="h-5 w-5 text-purple-500" /> Analisi AI della Performance
                    </DialogTitle>
                    <DialogDescription>
                        Un analista AI legge le tue metriche del periodo <strong>{period.toUpperCase()}</strong> e produce un report strutturato con punti di forza, debolezze e azioni consigliate.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                    {!isConfigured && (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                                <div>
                                    <p className="font-semibold text-amber-800 dark:text-amber-200">Provider AI non configurato</p>
                                    <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
                                        Vai nella tab <strong>AI</strong> e clicca <strong>Config</strong> per salvare provider, modello e chiave sul server.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                                <p className="text-rose-700 dark:text-rose-300">{error}</p>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <div className="relative">
                                <div className="absolute inset-0 animate-pulse rounded-full bg-purple-500/30 blur-xl" />
                                <Loader2 className="relative h-10 w-10 animate-spin text-purple-500" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">L&apos;AI sta analizzando i tuoi dati...</p>
                            <p className="text-xs text-muted-foreground">Ragionamento su ROI, TWR, Sharpe, drawdown e trend mensili</p>
                        </div>
                    )}

                    {analysis && !loading && (
                        <div className="assistant-markdown rounded-2xl border border-border/60 bg-background/60 p-5">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ children }) => <h1 className="first:mt-0 mb-2 mt-4 text-lg font-bold text-purple-700 dark:text-purple-300">{children}</h1>,
                                    h2: ({ children }) => <h2 className="first:mt-0 mb-2 mt-4 border-b border-border/60 pb-1 text-base font-bold text-foreground">{children}</h2>,
                                    h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-bold text-foreground">{children}</h3>,
                                    p: ({ children }) => <p className="my-2 text-sm leading-relaxed">{children}</p>,
                                    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 text-sm">{children}</ul>,
                                    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 text-sm">{children}</ol>,
                                    li: ({ children }) => <li className="leading-snug">{children}</li>,
                                    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                                    table: ({ children }) => <div className="my-3 overflow-x-auto rounded-lg border border-border/60"><table className="w-full border-collapse text-xs">{children}</table></div>,
                                    thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
                                    th: ({ children }) => <th className="border-b border-border/60 px-2 py-1.5 text-left font-bold">{children}</th>,
                                    td: ({ children }) => <td className="border-b border-border/40 px-2 py-1.5">{children}</td>,
                                    blockquote: ({ children }) => <blockquote className="my-2 border-l-4 border-purple-500/50 pl-3 italic text-muted-foreground">{children}</blockquote>,
                                }}
                            >
                                {analysis}
                            </ReactMarkdown>
                        </div>
                    )}

                    {!loading && !analysis && !error && !isConfigured && (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            Configura il provider AI per generare l&apos;analisi.
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                    <p className="flex-1 text-[10px] italic text-muted-foreground">
                        Informativa, non consulenza finanziaria. Verifica sempre autonomamente.
                    </p>
                    {analysis && !loading && (
                        <>
                            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="gap-1.5">
                                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copiato" : "Copia"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => void run()} className="gap-1.5" disabled={loading}>
                                <RefreshCw className="h-4 w-4" /> Rigenera
                            </Button>
                        </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Chiudi</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
});
