"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatEuro } from "@/lib/format";
import { Printer, TrendingUp, Wallet, PieChart as PieChartIcon, Flame, Building2, Gift, FileText } from "lucide-react";

interface AssetRecordLite {
    date: string;
    realEstateValue?: number;
    liquidStockValue?: number;
    stocksSnapshotValue?: number;
    safeHavens?: number;
    emergencyFund?: number;
    pensionFund?: number;
    debtsTotal?: number;
    bitcoinAmount?: number;
    bitcoinPrice?: number;
    totalNetWorth?: number;
}

interface PerformanceMetrics {
    roi: number | null;
    cagr: number | null;
    twr: number | null;
    mwr: number | null;
    volatility: number | null;
    sharpeRatio: number | null;
    maxDrawdown: number | null;
    currentDrawdown: number | null;
    startNetWorth: number;
    endNetWorth: number;
    totalCashFlow: number;
    months: number;
}

const SECTION_CONFIG = {
    patrimonio: { label: "Patrimonio", icon: Wallet },
    allocazione: { label: "Allocazione", icon: PieChartIcon },
    performance: { label: "Performance", icon: TrendingUp },
    fire: { label: "FIRE", icon: Flame },
    mutuo: { label: "Mutuo / Debiti", icon: Building2 },
    dividendi: { label: "Dividendi", icon: Gift },
} as const;

type SectionId = keyof typeof SECTION_CONFIG;

function fmtPct(v: number | null | undefined, decimals = 1): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}

function ReportContent() {
    const params = useSearchParams();
    const sections = useMemo(() => {
        const raw = params?.get("sections") ?? "";
        return raw.split(",").filter((s): s is SectionId => s in SECTION_CONFIG);
    }, [params]);

    const [patrimonioHistory, setPatrimonioHistory] = useState<AssetRecordLite[]>([]);
    const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
    const [preferences, setPreferences] = useState<Record<string, unknown> | null>(null);
    const [dividendsOverview, setDividendsOverview] = useState<{ totalNet: number; totalGross: number; count: number; upcomingNet: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const promises: Promise<Response>[] = [];
                const keys: string[] = [];

                if (sections.includes("patrimonio") || sections.includes("allocazione")) {
                    promises.push(fetch("/api/patrimonio", { credentials: "include" }));
                    keys.push("patrimonio");
                }
                if (sections.includes("performance")) {
                    promises.push(fetch("/api/performance?period=all", { credentials: "include" }));
                    keys.push("performance");
                }
                if (sections.includes("fire") || sections.includes("mutuo")) {
                    promises.push(fetch("/api/preferences", { credentials: "include" }));
                    keys.push("preferences");
                }
                if (sections.includes("dividendi")) {
                    promises.push(fetch("/api/dividends/stats", { credentials: "include" }));
                    keys.push("dividends");
                }

                const responses = await Promise.all(promises);
                for (let i = 0; i < responses.length; i++) {
                    const res = responses[i];
                    if (!res.ok) continue;
                    const json = await res.json();
                    switch (keys[i]) {
                        case "patrimonio":
                            setPatrimonioHistory(json.history ?? []);
                            break;
                        case "performance":
                            setPerformance(json.metrics ?? null);
                            break;
                        case "preferences":
                            setPreferences(json.preferences ?? json);
                            break;
                        case "dividends":
                            setDividendsOverview(json.overview ?? null);
                            break;
                    }
                }
            } catch (e) {
                console.error("Report fetch error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [sections]);

    // Auto-print when loaded
    useEffect(() => {
        if (!loading && sections.length > 0) {
            const t = setTimeout(() => window.print(), 600);
            return () => clearTimeout(t);
        }
    }, [loading, sections]);

    const latestSnapshot = patrimonioHistory[patrimonioHistory.length - 1];
    const firstSnapshot = patrimonioHistory[0];

    const computeNw = (r: AssetRecordLite | undefined): number => {
        if (!r) return 0;
        if (r.totalNetWorth != null) return r.totalNetWorth;
        const crypto = (r.bitcoinAmount || 0) * (r.bitcoinPrice || 0);
        return (r.realEstateValue || 0) + (r.liquidStockValue || 0) + (r.stocksSnapshotValue || 0) +
            (r.safeHavens || 0) + (r.emergencyFund || 0) + (r.pensionFund || 0) +
            crypto - (r.debtsTotal || 0);
    };

    const currentNw = computeNw(latestSnapshot);
    const startNw = computeNw(firstSnapshot);
    const growth = startNw > 0 ? ((currentNw - startNw) / startNw) * 100 : null;

    const assetBreakdown = useMemo(() => {
        if (!latestSnapshot) return [];
        const r = latestSnapshot;
        const crypto = (r.bitcoinAmount || 0) * (r.bitcoinPrice || 0);
        return [
            { label: "Immobili", value: r.realEstateValue || 0, color: "#3b82f6" },
            { label: "Azioni/ETF", value: (r.liquidStockValue || 0) + (r.stocksSnapshotValue || 0), color: "#8b5cf6" },
            { label: "Beni Rifugio", value: r.safeHavens || 0, color: "#f59e0b" },
            { label: "Fondo Emergenza", value: r.emergencyFund || 0, color: "#10b981" },
            { label: "Fondo Pensione", value: r.pensionFund || 0, color: "#ec4899" },
            { label: "Bitcoin", value: crypto, color: "#f97316" },
        ].filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
    }, [latestSnapshot]);

    const totalGross = assetBreakdown.reduce((s, x) => s + x.value, 0);
    const debts = latestSnapshot?.debtsTotal || 0;

    return (
        <div className="report-container">
            <style jsx global>{`
                @page {
                    size: A4;
                    margin: 15mm 12mm;
                }
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .page-break { page-break-after: always; }
                    .avoid-break { page-break-inside: avoid; }
                }
                .report-container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 30px 20px;
                    background: white;
                    color: #0f172a;
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .report-container h1 { font-size: 28px; font-weight: 800; margin: 0 0 8px 0; color: #1e1b4b; }
                .report-container h2 { font-size: 22px; font-weight: 700; margin: 24px 0 12px 0; color: #312e81; border-bottom: 2px solid #8b5cf6; padding-bottom: 6px; display: flex; align-items: center; gap: 8px; }
                .report-container h3 { font-size: 15px; font-weight: 700; margin: 16px 0 8px 0; color: #475569; }
                .report-container table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                .report-container th, .report-container td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                .report-container th { background: #f1f5f9; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
                .report-container .tabular { font-variant-numeric: tabular-nums; }
                .report-container .text-right { text-align: right; }
                .report-container .text-center { text-align: center; }
                .report-container .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0; }
                .report-container .kpi-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; }
                .report-container .kpi-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 4px; }
                .report-container .kpi-value { font-size: 20px; font-weight: 800; color: #0f172a; }
                .report-container .positive { color: #059669; }
                .report-container .negative { color: #dc2626; }
                .report-container .muted { color: #64748b; }
                .report-container .alloc-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
                .report-container .alloc-label { flex: 0 0 140px; font-weight: 600; }
                .report-container .alloc-bar-bg { flex: 1; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; }
                .report-container .alloc-bar { height: 100%; border-radius: 5px; }
                .report-container .alloc-value { flex: 0 0 110px; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
                .report-container .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
                .print-button {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 10px 18px;
                    background: #8b5cf6;
                    color: white;
                    border: none;
                    border-radius: 20px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
            `}</style>

            <button className="print-button no-print" onClick={() => window.print()}>
                <Printer size={16} /> Stampa / Salva PDF
            </button>

            {/* Header */}
            <header style={{ borderBottom: "3px solid #8b5cf6", paddingBottom: 16, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <h1>Report Patrimoniale</h1>
                        <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                            Generato da Effetto Composto — {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div className="muted" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>Patrimonio Netto</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#1e1b4b", fontVariantNumeric: "tabular-nums" }}>
                            {loading ? "—" : formatEuro(currentNw)}
                        </div>
                    </div>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: "center", padding: 40 }} className="muted">Caricamento dati…</div>
            ) : (
                <>
                    {/* PATRIMONIO */}
                    {sections.includes("patrimonio") && (
                        <section className="avoid-break">
                            <h2><Wallet size={20} /> Patrimonio</h2>
                            <div className="kpi-grid">
                                <div className="kpi-box">
                                    <div className="kpi-label">Netto attuale</div>
                                    <div className="kpi-value tabular">{formatEuro(currentNw)}</div>
                                </div>
                                <div className="kpi-box">
                                    <div className="kpi-label">Asset lordi</div>
                                    <div className="kpi-value tabular">{formatEuro(totalGross)}</div>
                                </div>
                                <div className="kpi-box">
                                    <div className="kpi-label">Debiti</div>
                                    <div className="kpi-value tabular negative">{formatEuro(debts)}</div>
                                </div>
                                <div className="kpi-box">
                                    <div className="kpi-label">Crescita storica</div>
                                    <div className={`kpi-value tabular ${growth != null && growth >= 0 ? "positive" : "negative"}`}>
                                        {fmtPct(growth)}
                                    </div>
                                </div>
                            </div>
                            {patrimonioHistory.length >= 2 && firstSnapshot && (
                                <p className="muted" style={{ fontSize: 11 }}>
                                    Periodo analizzato: {firstSnapshot.date} → {latestSnapshot?.date} ({patrimonioHistory.length} snapshot).
                                </p>
                            )}
                        </section>
                    )}

                    {/* ALLOCAZIONE */}
                    {sections.includes("allocazione") && assetBreakdown.length > 0 && (
                        <section className="avoid-break">
                            <h2><PieChartIcon size={20} /> Asset Allocation</h2>
                            {assetBreakdown.map((a) => {
                                const pct = totalGross > 0 ? (a.value / totalGross) * 100 : 0;
                                return (
                                    <div key={a.label} className="alloc-row">
                                        <div className="alloc-label">
                                            <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: a.color, marginRight: 6 }} />
                                            {a.label}
                                        </div>
                                        <div className="alloc-bar-bg">
                                            <div className="alloc-bar" style={{ width: `${pct}%`, background: a.color }} />
                                        </div>
                                        <div className="alloc-value">
                                            {formatEuro(a.value)}
                                            <span className="muted" style={{ fontSize: 10, marginLeft: 6 }}>{pct.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </section>
                    )}

                    {/* PERFORMANCE */}
                    {sections.includes("performance") && (
                        <section className="avoid-break">
                            <h2><TrendingUp size={20} /> Performance Portafoglio</h2>
                            {performance ? (
                                <>
                                    <div className="kpi-grid">
                                        <div className="kpi-box">
                                            <div className="kpi-label">ROI</div>
                                            <div className={`kpi-value tabular ${(performance.roi ?? 0) >= 0 ? "positive" : "negative"}`}>{fmtPct(performance.roi)}</div>
                                        </div>
                                        <div className="kpi-box">
                                            <div className="kpi-label">CAGR</div>
                                            <div className={`kpi-value tabular ${(performance.cagr ?? 0) >= 0 ? "positive" : "negative"}`}>{fmtPct(performance.cagr)}</div>
                                        </div>
                                        <div className="kpi-box">
                                            <div className="kpi-label">TWR annualizz.</div>
                                            <div className={`kpi-value tabular ${(performance.twr ?? 0) >= 0 ? "positive" : "negative"}`}>{fmtPct(performance.twr)}</div>
                                        </div>
                                        <div className="kpi-box">
                                            <div className="kpi-label">Volatilità σ</div>
                                            <div className="kpi-value tabular">{fmtPct(performance.volatility)}</div>
                                        </div>
                                    </div>
                                    <table>
                                        <thead>
                                            <tr><th>Metrica</th><th className="text-right">Valore</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>Money-Weighted Return (IRR)</td><td className="text-right tabular">{fmtPct(performance.mwr)}</td></tr>
                                            <tr><td>Sharpe Ratio</td><td className="text-right tabular">{performance.sharpeRatio != null ? performance.sharpeRatio.toFixed(2) : "—"}</td></tr>
                                            <tr><td>Max Drawdown</td><td className="text-right tabular negative">{fmtPct(performance.maxDrawdown)}</td></tr>
                                            <tr><td>Drawdown attuale</td><td className="text-right tabular">{fmtPct(performance.currentDrawdown)}</td></tr>
                                            <tr><td>Contributi netti</td><td className="text-right tabular">{formatEuro(performance.totalCashFlow)}</td></tr>
                                            <tr><td>Mesi analizzati</td><td className="text-right tabular">{performance.months}</td></tr>
                                        </tbody>
                                    </table>
                                </>
                            ) : (
                                <p className="muted">Dati di performance non disponibili (servono almeno 3 snapshot mensili).</p>
                            )}
                        </section>
                    )}

                    {/* FIRE */}
                    {sections.includes("fire") && preferences && (
                        <section className="avoid-break">
                            <h2><Flame size={20} /> Indipendenza Finanziaria (FIRE)</h2>
                            <FireReportSection preferences={preferences} currentCapital={currentNw} />
                        </section>
                    )}

                    {/* MUTUO */}
                    {sections.includes("mutuo") && preferences && (
                        <section className="avoid-break">
                            <h2><Building2 size={20} /> Mutuo &amp; Debiti</h2>
                            <MortgageReportSection preferences={preferences} />
                        </section>
                    )}

                    {/* DIVIDENDI */}
                    {sections.includes("dividendi") && (
                        <section className="avoid-break">
                            <h2><Gift size={20} /> Dividendi</h2>
                            {dividendsOverview ? (
                                <div className="kpi-grid">
                                    <div className="kpi-box">
                                        <div className="kpi-label">Netto incassato</div>
                                        <div className="kpi-value tabular positive">{formatEuro(dividendsOverview.totalNet)}</div>
                                    </div>
                                    <div className="kpi-box">
                                        <div className="kpi-label">Lordo</div>
                                        <div className="kpi-value tabular">{formatEuro(dividendsOverview.totalGross)}</div>
                                    </div>
                                    <div className="kpi-box">
                                        <div className="kpi-label">Stacchi</div>
                                        <div className="kpi-value tabular">{dividendsOverview.count}</div>
                                    </div>
                                    <div className="kpi-box">
                                        <div className="kpi-label">In arrivo</div>
                                        <div className="kpi-value tabular">{formatEuro(dividendsOverview.upcomingNet)}</div>
                                    </div>
                                </div>
                            ) : (
                                <p className="muted">Nessun dividendo registrato.</p>
                            )}
                        </section>
                    )}

                    {/* Footer */}
                    <footer className="footer">
                        <p>
                            Documento generato da <strong>Effetto Composto</strong> il {new Date().toLocaleString("it-IT")}.
                            I valori sono calcolati sulla base degli snapshot e delle preferenze personali. Non costituiscono consulenza finanziaria.
                        </p>
                        <p style={{ marginTop: 6 }}>
                            <FileText size={10} style={{ display: "inline", verticalAlign: "middle" }} /> Sezioni incluse: {sections.map((s) => SECTION_CONFIG[s].label).join(" · ")}
                        </p>
                    </footer>
                </>
            )}
        </div>
    );
}

function FireReportSection({ preferences, currentCapital }: { preferences: Record<string, unknown>; currentCapital: number }) {
    const expenses = Number(preferences.expectedMonthlyExpenses ?? 2500);
    const swr = Number(preferences.fireWithdrawalRate ?? 3.25);
    const ret = Number(preferences.fireExpectedReturn ?? 6);
    const infl = Number(preferences.expectedInflation ?? 2);
    const birthYear = Number(preferences.birthYear ?? 1990);
    const retireAge = Number(preferences.retirementAge ?? 60);

    const target = (expenses * 12) / (swr / 100);
    const realR = (1 + ret / 100) / (1 + infl / 100) - 1;
    const currentAge = new Date().getFullYear() - birthYear;
    const yearsToRetire = Math.max(0, retireAge - currentAge);
    const coastTarget = realR > 0 ? target / Math.pow(1 + realR, yearsToRetire) : target;
    const progress = target > 0 ? (currentCapital / target) * 100 : 0;
    const coastReached = currentCapital >= coastTarget;

    return (
        <>
            <div className="kpi-grid">
                <div className="kpi-box">
                    <div className="kpi-label">Target FIRE</div>
                    <div className="kpi-value tabular">{formatEuro(target)}</div>
                </div>
                <div className="kpi-box">
                    <div className="kpi-label">Progresso</div>
                    <div className="kpi-value tabular">{progress.toFixed(1)}%</div>
                </div>
                <div className="kpi-box">
                    <div className="kpi-label">Coast FIRE</div>
                    <div className={`kpi-value tabular ${coastReached ? "positive" : ""}`}>{formatEuro(coastTarget)}</div>
                </div>
                <div className="kpi-box">
                    <div className="kpi-label">Anni al traguardo</div>
                    <div className="kpi-value tabular">{yearsToRetire}</div>
                </div>
            </div>
            <table>
                <thead><tr><th>Parametro</th><th className="text-right">Valore</th></tr></thead>
                <tbody>
                    <tr><td>Spese mensili attese</td><td className="text-right tabular">{formatEuro(expenses)}</td></tr>
                    <tr><td>Tasso di prelievo (SWR)</td><td className="text-right tabular">{swr}%</td></tr>
                    <tr><td>Rendimento nominale atteso</td><td className="text-right tabular">{ret}%</td></tr>
                    <tr><td>Inflazione attesa</td><td className="text-right tabular">{infl}%</td></tr>
                    <tr><td>Rendimento reale</td><td className="text-right tabular">{(realR * 100).toFixed(2)}%</td></tr>
                    <tr><td>Età attuale / Ritiro</td><td className="text-right tabular">{currentAge} → {retireAge} anni</td></tr>
                </tbody>
            </table>
        </>
    );
}

function MortgageReportSection({ preferences }: { preferences: Record<string, unknown> }) {
    const propertyPrice = Number(preferences.propertyPrice ?? 0);
    const downpayment = Number(preferences.downpayment ?? 0);
    const rate = Number(preferences.rate ?? 0);
    const years = Number(preferences.years ?? 0);
    const loanAmount = Math.max(0, propertyPrice - downpayment);
    const monthlyRate = rate / 100 / 12;
    const n = years * 12;
    const installment = monthlyRate > 0 && n > 0
        ? loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
        : 0;

    if (propertyPrice === 0) {
        return <p className="muted">Nessun mutuo configurato.</p>;
    }

    return (
        <table>
            <thead><tr><th>Parametro</th><th className="text-right">Valore</th></tr></thead>
            <tbody>
                <tr><td>Prezzo immobile</td><td className="text-right tabular">{formatEuro(propertyPrice)}</td></tr>
                <tr><td>Anticipo</td><td className="text-right tabular">{formatEuro(downpayment)}</td></tr>
                <tr><td>Capitale finanziato</td><td className="text-right tabular">{formatEuro(loanAmount)}</td></tr>
                <tr><td>Tasso annuo</td><td className="text-right tabular">{rate}%</td></tr>
                <tr><td>Durata</td><td className="text-right tabular">{years} anni ({n} rate)</td></tr>
                <tr><td><strong>Rata mensile</strong></td><td className="text-right tabular"><strong>{formatEuro(installment)}</strong></td></tr>
                <tr><td>Totale interessi</td><td className="text-right tabular">{formatEuro(Math.max(0, installment * n - loanAmount))}</td></tr>
            </tbody>
        </table>
    );
}

export default function ReportExportPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Caricamento…</div>}>
            <ReportContent />
        </Suspense>
    );
}
