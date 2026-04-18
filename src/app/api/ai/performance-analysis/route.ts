import { NextResponse } from "next/server";
import { chat } from "@/lib/ai/providers";
import { getStoredAiSettings } from "@/lib/ai/server-config";
import { loadAssistantUserProfile } from "@/lib/ai/user-context";
import { formatEuro } from "@/lib/format";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

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

const SYSTEM_PROMPT = `Sei un analista finanziario senior. Analizza le metriche di performance di un portafoglio italiano e restituisci un report strutturato.

REGOLE:
- Rispondi in italiano, tono professionale ma umano.
- NON inventare numeri: usa esclusivamente quelli nei dati forniti.
- Struttura la risposta in Markdown con QUESTE sezioni esatte, in questo ordine:
  1. **Sintesi esecutiva** (2-3 righe, verdetto di alto livello)
  2. **Punti di forza** (lista puntata, 2-4 punti con cifra specifica)
  3. **Aree di debolezza o attenzione** (lista puntata, 2-4 punti)
  4. **Analisi del rischio** (volatilita', Sharpe, drawdown: commenta se accettabile rispetto alla CAGR ottenuta)
  5. **Azioni consigliate** (3-5 azioni concrete numerate, nessun disclaimer generico)
  6. **Confronto con benchmark indicativi** (MSCI World CAGR ~7-9% reale, S&P500 ~10%, 60/40 ~6%) - stima dov'e' il portafoglio rispetto a questi
- Se TWR discrepa significativamente da CAGR, spiegalo (contributi hanno aiutato/penalizzato).
- Se volatilita' alta ma Sharpe basso, segnalalo come red flag.
- Se max drawdown > -25%, commenta la resilienza emotiva richiesta.
- Evita platitudes ("diversifica", "investi a lungo termine"). Dai consigli specifici basati sulle cifre.
- Lunghezza target: 400-600 parole totali.`;

function fmtPct(v: number | null): string {
    if (v == null || !Number.isFinite(v)) return "N/A";
    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function buildUserPrompt(
    period: string,
    metrics: PerformanceMetricsLite,
    monthlyReturns: { ym: string; returnPct: number }[],
    underwaterSeries: { date: string; drawdown: number }[],
    userProfile: string,
): string {
    const last12 = monthlyReturns
        .slice(-12)
        .map((entry) => `  ${entry.ym}: ${entry.returnPct.toFixed(2)}%`)
        .join("\n");

    const worstDd = underwaterSeries.reduce(
        (min, entry) => (entry.drawdown < min.drawdown ? entry : min),
        { date: "", drawdown: 0 },
    );

    return `Analizza queste metriche di performance (periodo: ${period.toUpperCase()}).

=== METRICHE AGGREGATE ===
Periodo analizzato: ${metrics.startDate} -> ${metrics.endDate} (${metrics.months} mesi)
Patrimonio iniziale: ${formatEuro(metrics.startNetWorth)}
Patrimonio finale: ${formatEuro(metrics.endNetWorth)}
Contributi netti nel periodo: ${formatEuro(metrics.totalCashFlow)}

ROI totale: ${fmtPct(metrics.roi)}
CAGR (annualizzato da ROI): ${fmtPct(metrics.cagr)}
TWR (Time-Weighted Return annualizzato): ${fmtPct(metrics.twr)}
MWR / IRR (Money-Weighted Return): ${fmtPct(metrics.mwr)}

=== RISCHIO ===
Volatilita' annualizzata (sigma): ${fmtPct(metrics.volatility)}
Sharpe Ratio: ${metrics.sharpeRatio != null ? metrics.sharpeRatio.toFixed(2) : "N/A"}
Max Drawdown storico: ${fmtPct(metrics.maxDrawdown)}${metrics.maxDrawdownDate ? ` (al ${metrics.maxDrawdownDate})` : ""}
Durata drawdown peggiore: ${metrics.drawdownDurationMonths ?? "N/A"} mesi
Recovery: ${metrics.recoveryMonths ?? "in corso"} mesi
Drawdown attuale: ${fmtPct(metrics.currentDrawdown)}

=== RENDIMENTI ULTIMI 12 MESI ===
${last12 || "(n/a)"}

=== DRAWDOWN PEGGIORE REGISTRATO ===
${worstDd.date ? `${worstDd.date}: ${fmtPct(worstDd.drawdown)}` : "(nessuno significativo)"}

${userProfile.trim() ? `=== PROFILO UTENTE ===\n${userProfile.trim()}\n` : ""}Produci il report come da istruzioni di sistema.`;
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const settings = await getStoredAiSettings(userId);
        if (!settings) {
            return NextResponse.json({
                error: "Configura prima provider, modello e API key AI sul server",
            }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const period = typeof body.period === "string" ? body.period : "";
        const metrics = body.metrics as PerformanceMetricsLite | null;
        const monthlyReturns = Array.isArray(body.monthlyReturns) ? body.monthlyReturns : [];
        const underwaterSeries = Array.isArray(body.underwaterSeries) ? body.underwaterSeries : [];

        if (!period || !metrics) {
            return NextResponse.json({ error: "Dati performance non validi" }, { status: 400 });
        }

        const userProfile = await loadAssistantUserProfile(userId);
        const result = await chat({
            provider: settings.provider,
            apiKey: settings.apiKey,
            model: settings.model,
            systemPrompt: SYSTEM_PROMPT,
            messages: [{
                role: "user",
                content: buildUserPrompt(period, metrics, monthlyReturns, underwaterSeries, userProfile),
            }],
            maxToolRoundtrips: 0,
        });

        return NextResponse.json({
            analysis: result.text || "(nessuna risposta)",
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("POST /api/ai/performance-analysis error:", error);
        return NextResponse.json({ error: (error as Error).message || "Errore interno" }, { status: 500 });
    }
}
