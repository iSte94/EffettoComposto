"use client";

import { memo, useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, AlertTriangle, Copy, Check, RefreshCw, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useAiSettings } from "@/hooks/useAiSettings";
import { useAiUserProfile } from "@/hooks/useAiUserProfile";
import { chat } from "@/lib/ai/providers";
import { formatEuro } from "@/lib/format";

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

const SYSTEM_PROMPT = `Sei un analista finanziario senior. Analizza le metriche di performance di un portafoglio italiano e restituisci un report strutturato.

REGOLE:
- Rispondi in italiano, tono professionale ma umano.
- NON inventare numeri: usa esclusivamente quelli nei dati forniti.
- Struttura la risposta in Markdown con QUESTE sezioni esatte, in questo ordine:
  1. **Sintesi esecutiva** (2-3 righe, verdetto di alto livello)
  2. **Punti di forza** (lista puntata, 2-4 punti con cifra specifica)
  3. **Aree di debolezza o attenzione** (lista puntata, 2-4 punti)
  4. **Analisi del rischio** (volatilita', Sharpe, drawdown — commenta se accettabile rispetto alla CAGR ottenuta)
  5. **Azioni consigliate** (3-5 azioni concrete numerate, nessun disclaimer generico)
  6. **Confronto con benchmark indicativi** (MSCI World CAGR ~7-9% reale, S&P500 ~10%, 60/40 ~6%) — stima dov'e' il portafoglio rispetto a questi
- Se TWR discrepa significativamente da CAGR, spiegalo (contributi hanno aiutato/penalizzato).
- Se volatilita' alta ma Sharpe basso, segnalalo come red flag.
- Se max drawdown > -25%, commenta la resilienza emotiva richiesta.
- Evita platitudes ("diversifica", "investi a lungo termine"). Dai consigli specifici basati sulle cifre.
- Lunghezza target: 400-600 parole totali.`;

function fmtPct(v: number | null): string {
    if (v == null || !Number.isFinite(v)) return "N/A";
    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function buildUserPrompt(period: string, m: PerformanceMetricsLite, monthly: { ym: string; returnPct: number }[], drawdowns: { date: string; drawdown: number }[], userProfile: string): string {
    const last12 = monthly.slice(-12).map((r) => `  ${r.ym}: ${r.returnPct.toFixed(2)}%`).join("\n");
    const worstDd = drawdowns.reduce((min, d) => d.drawdown < min.drawdown ? d : min, { date: "", drawdown: 0 });

    return `Analizza queste metriche di performance (periodo: ${period.toUpperCase()}).

=== METRICHE AGGREGATE ===
Periodo analizzato: ${m.startDate} → ${m.endDate} (${m.months} mesi)
Patrimonio iniziale: ${formatEuro(m.startNetWorth)}
Patrimonio finale: ${formatEuro(m.endNetWorth)}
Contributi netti nel periodo: ${formatEuro(m.totalCashFlow)}

ROI totale: ${fmtPct(m.roi)}
CAGR (annualizzato da ROI): ${fmtPct(m.cagr)}
TWR (Time-Weighted Return annualizzato): ${fmtPct(m.twr)}
MWR / IRR (Money-Weighted Return): ${fmtPct(m.mwr)}

=== RISCHIO ===
Volatilita' annualizzata (σ): ${fmtPct(m.volatility)}
Sharpe Ratio: ${m.sharpeRatio != null ? m.sharpeRatio.toFixed(2) : "N/A"}
Max Drawdown storico: ${fmtPct(m.maxDrawdown)}${m.maxDrawdownDate ? ` (al ${m.maxDrawdownDate})` : ""}
Durata drawdown peggiore: ${m.drawdownDurationMonths ?? "N/A"} mesi
Recovery: ${m.recoveryMonths ?? "in corso"} mesi
Drawdown attuale: ${fmtPct(m.currentDrawdown)}

=== RENDIMENTI ULTIMI 12 MESI ===
${last12 || "(n/a)"}

=== DRAWDOWN PEGGIORE REGISTRATO ===
${worstDd.date ? `${worstDd.date}: ${fmtPct(worstDd.drawdown)}` : "(nessuno significativo)"}

${userProfile.trim() ? `=== PROFILO UTENTE ===\n${userProfile.trim()}\n` : ""}
Produci il report come da istruzioni di sistema.`;
}

export const AiPerformanceAnalysisDialog = memo(function AiPerformanceAnalysisDialog({
    trigger,
    period,
    metrics,
    monthlyReturns,
    underwaterSeries,
}: Props) {
    const { settings, loaded } = useAiSettings();
    const { profile: userProfile } = useAiUserProfile();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const hasRun = useRef(false);

    const isConfigured = loaded && !!settings.apiKey && !!settings.model;

    const run = async () => {
        if (!metrics) {
            setError("Metriche non disponibili");
            return;
        }
        if (!isConfigured) {
            setError("Configura provider AI e API key nella tab AI → Config");
            return;
        }
        setLoading(true);
        setAnalysis("");
        setError(null);
        try {
            const prompt = buildUserPrompt(period, metrics, monthlyReturns, underwaterSeries, userProfile);
            const res = await chat({
                provider: settings.provider,
                apiKey: settings.apiKey,
                model: settings.model,
                systemPrompt: SYSTEM_PROMPT,
                messages: [{ role: "user", content: prompt }],
                maxToolRoundtrips: 0,
            });
            setAnalysis(res.text || "(nessuna risposta)");
        } catch (e) {
            setError((e as Error).message.slice(0, 300));
        } finally {
            setLoading(false);
        }
    };

    // Auto-run on open (once per open session)
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
                    <Button variant="outline" size="sm" className="rounded-full gap-1.5 border-purple-400/50 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20">
                        <Sparkles className="w-3.5 h-3.5" /> Analizza con AI
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-xl border-border/70 rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Brain className="w-5 h-5 text-purple-500" /> Analisi AI della Performance
                    </DialogTitle>
                    <DialogDescription>
                        Un analista AI legge le tue metriche del periodo <strong>{period.toUpperCase()}</strong> e produce un report strutturato con punti di forza, debolezze e azioni consigliate.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
                    {!isConfigured && (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-amber-800 dark:text-amber-200">Provider AI non configurato</p>
                                    <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                                        Vai nella tab <strong>AI</strong> e clicca <strong>Config</strong> per impostare Gemini o OpenRouter con la tua API key.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                <p className="text-rose-700 dark:text-rose-300">{error}</p>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl animate-pulse" />
                                <Loader2 className="w-10 h-10 text-purple-500 animate-spin relative" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">L&apos;AI sta analizzando i tuoi dati...</p>
                            <p className="text-xs text-muted-foreground">Ragionamento su ROI, TWR, Sharpe, drawdown e trend mensili</p>
                        </div>
                    )}

                    {analysis && !loading && (
                        <div className="rounded-2xl border border-border/60 bg-background/60 p-5 assistant-markdown">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0 text-purple-700 dark:text-purple-300">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-bold mt-4 mb-2 first:mt-0 text-foreground border-b border-border/60 pb-1">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1.5 text-foreground">{children}</h3>,
                                    p: ({ children }) => <p className="my-2 text-sm leading-relaxed">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 text-sm">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-sm">{children}</ol>,
                                    li: ({ children }) => <li className="leading-snug">{children}</li>,
                                    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                                    table: ({ children }) => <div className="my-3 overflow-x-auto rounded-lg border border-border/60"><table className="w-full text-xs border-collapse">{children}</table></div>,
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

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/70">
                    <p className="text-[10px] text-muted-foreground italic flex-1">
                        Informativa, non consulenza finanziaria. Verifica sempre autonomamente.
                    </p>
                    {analysis && !loading && (
                        <>
                            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="gap-1.5">
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                {copied ? "Copiato" : "Copia"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => void run()} className="gap-1.5" disabled={loading}>
                                <RefreshCw className="w-4 h-4" /> Rigenera
                            </Button>
                        </>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Chiudi</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
});
