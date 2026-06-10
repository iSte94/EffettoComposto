"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatEuro } from "@/lib/format";
import { LAZY_PORTFOLIOS, LazyPortfolio, PeriodStats } from "@/lib/lazy-portfolios-data";
import { computeRealReturn } from "@/lib/finance/fire-projection";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Layers,
  Info,
  TrendingUp,
  Percent,
  Coins,
  ShieldCheck,
  TrendingDown,
  ArrowRightLeft,
  BookOpen,
  HelpCircle,
  Play
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  CHART_AXIS_PROPS,
  CHART_COLORS,
  CHART_CURSOR,
  CHART_GRID_PROPS,
  CHART_LEGEND_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  formatCompactEuroAxis,
} from "@/components/ui/chart-style";

// Helper per formattare le percentuali
const formatPct = (val: number) => `${val.toFixed(2)}%`;

export function LazyPortfoliosDashboard() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("golden-butterfly");
  const [selectedPeriod, setSelectedPeriod] = useState<"1985-2020" | "2000-2020" | "2010-2020">("1985-2020");
  const [etfCurrency, setEtfCurrency] = useState<"EUR" | "USD">("EUR");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Parametri simulatore Monte Carlo / SWR
  const [initialCapital, setInitialCapital] = useState<number>(300000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);
  const [withdrawalRatePct, setWithdrawalRatePct] = useState<number>(4.0);
  const [withdrawalYears, setWithdrawalYears] = useState<number>(30);
  const [inflationRatePct, setInflationRatePct] = useState<number>(2.0);

  // Trova il portafoglio selezionato
  const selectedPortfolio = useMemo(() => {
    return LAZY_PORTFOLIOS.find(p => p.id === selectedPortfolioId) || LAZY_PORTFOLIOS[0];
  }, [selectedPortfolioId]);

  // Filtra i portafogli
  const filteredPortfolios = useMemo(() => {
    if (filterCategory === "all") return LAZY_PORTFOLIOS;
    return LAZY_PORTFOLIOS.filter(p => p.category === filterCategory);
  }, [filterCategory]);

  // Statistiche correnti (in base a periodo selezionato)
  const currentPeriodStats = useMemo(() => {
    return selectedPortfolio.stats[selectedPeriod];
  }, [selectedPortfolio, selectedPeriod]);

  // Esegue la simulazione Monte Carlo lato client in euro reali (potere d'acquisto costante)
  const mcResult = useMemo(() => {
    // Rendimento medio nominale e deviazione standard per la simulazione
    // Usiamo le statistiche del portafoglio in EUR (per simulare investitori Eurozona)
    const stats = currentPeriodStats.eur;
    const nominalReturn = stats.returnPct;
    const std = stats.stdDevPct / 100;

    // Rendimento reale via equazione di Fisher esatta (coerente con il resto dell'applicazione)
    const mean = computeRealReturn(nominalReturn, inflationRatePct);

    const runs = 2000;
    const years = withdrawalYears;
    
    // Passaggio a base mensile (sul rendimento reale)
    const monthlyMean = Math.pow(1 + mean, 1 / 12) - 1;
    const monthlyStd = std / Math.sqrt(12);

    let successCount = 0;
    const allPaths: number[][] = Array(years + 1).fill(null).map(() => []);

    // Box-Muller transform per la distribuzione normale
    function normalRandom() {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    for (let r = 0; r < runs; r++) {
      let balance = initialCapital;
      let path = [balance];
      let failed = false;
      // Essendo basato su rendimento reale, il prelievo mensile è espresso in euro reali 
      // e mantiene lo stesso potere d'acquisto per tutta la durata del piano.
      const monthlyWithdrawal = (initialCapital * (withdrawalRatePct / 100)) / 12;

      for (let y = 1; y <= years; y++) {
        for (let m = 0; m < 12; m++) {
          const rand = normalRandom();
          const rMonth = monthlyMean + rand * monthlyStd;
          
          // Equazione reale: (Capitale - Prelievo + Risparmio) * (1 + rendimento_reale_casuale)
          balance = (balance - monthlyWithdrawal + monthlyContribution) * (1 + rMonth);
          
          if (balance < 0) {
            balance = 0;
            failed = true;
          }
        }
        path.push(Math.round(balance));
      }

      if (!failed) {
        successCount++;
      }

      // Memorizza la traiettoria annuale
      for (let y = 0; y <= years; y++) {
        allPaths[y].push(path[y]);
      }
    }

    // Calcolo dei percentili (p10, p50, p90) per anno
    const chartData = [];
    for (let y = 0; y <= years; y++) {
      const sorted = [...allPaths[y]].sort((a, b) => a - b);
      chartData.push({
        anno: y,
        p10: sorted[Math.floor(runs * 0.1)],
        p50: sorted[Math.floor(runs * 0.5)],
        p90: sorted[Math.floor(runs * 0.9)],
      });
    }

    const successRate = (successCount / runs) * 100;

    // Calcolo ricorsivo del SWR reale ottimale (che dà esattamente il 95% di successo)
    let low = 0;
    let high = 20;
    let swr95 = 0;
    
    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      let midSuccess = 0;
      const midWithdrawal = (initialCapital * (mid / 100)) / 12;

      for (let r = 0; r < 400; r++) { // Meno run per velocizzare la ricerca
        let balance = initialCapital;
        let failed = false;
        for (let y = 1; y <= years; y++) {
          for (let m = 0; m < 12; m++) {
            const rand = normalRandom();
            const rMonth = monthlyMean + rand * monthlyStd;
            balance = (balance - midWithdrawal + monthlyContribution) * (1 + rMonth);
            if (balance < 0) {
              balance = 0;
              failed = true;
              break;
            }
          }
          if (failed) break;
        }
        if (!failed) midSuccess++;
      }

      const rate = (midSuccess / 400) * 100;
      if (rate >= 95) {
        swr95 = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    return {
      successRate,
      chartData,
      swr95,
    };
  }, [initialCapital, monthlyContribution, withdrawalRatePct, withdrawalYears, inflationRatePct, currentPeriodStats]);

  const currencyLabel = etfCurrency === "EUR" ? "Armonizzati (EUR) per investitori europei" : "Originali (USD) per investitori statunitensi";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Intestazione */}
      <div className="space-y-4 pb-6 pt-4 text-center">
        <div className="mb-2 inline-flex items-center justify-center rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm backdrop-blur-md">
          <Compass className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="flex flex-wrap items-center justify-center gap-3 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
          Portafogli <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Lazy</span>
        </h1>
        <p className="mx-auto max-w-3xl text-base leading-relaxed text-muted-foreground md:text-xl">
          Esplora le asset allocation classiche della finanza personale, visualizza gli ETF reali (armonizzati UCITS per l&apos;Italia) e simula il loro comportamento di prelievo nel lungo termine.
        </p>
      </div>

      {/* Griglia Principale: Selezione + Dettagli */}
      <div className="grid gap-8 lg:grid-cols-12">
        
        {/* Colonna di sinistra: Lista Portafogli */}
        <div className="space-y-6 lg:col-span-4">
          <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-bold text-foreground text-md flex items-center gap-2">
                  <Layers className="size-4 text-emerald-500" /> Seleziona un portafoglio
                </h3>
              </div>

              {/* Filtro per categoria */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/40 p-1 text-[11px] font-semibold text-muted-foreground">
                <button
                  onClick={() => setFilterCategory("all")}
                  className={`rounded-lg py-1.5 transition-colors ${filterCategory === "all" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`}
                >
                  Tutti
                </button>
                <button
                  onClick={() => setFilterCategory("conservative")}
                  className={`rounded-lg py-1.5 transition-colors ${filterCategory === "conservative" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`}
                >
                  Conservativi
                </button>
                <button
                  onClick={() => setFilterCategory("balanced")}
                  className={`rounded-lg py-1.5 transition-colors ${filterCategory === "balanced" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`}
                >
                  Bilanciati
                </button>
                <button
                  onClick={() => setFilterCategory("aggressive")}
                  className={`rounded-lg py-1.5 transition-colors ${filterCategory === "aggressive" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`}
                >
                  Aggressivi
                </button>
              </div>

              {/* Lista Portafogli filtrati */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredPortfolios.map((portfolio) => {
                  const isSelected = portfolio.id === selectedPortfolioId;
                  const totalEquity = portfolio.allocation.stocks;
                  return (
                    <button
                      key={portfolio.id}
                      onClick={() => setSelectedPortfolioId(portfolio.id)}
                      className={`flex w-full flex-col text-left p-3 rounded-2xl border transition-all ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200"
                          : "border-border/60 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="font-bold text-sm text-foreground">{portfolio.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          portfolio.category === "conservative" 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : portfolio.category === "balanced"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        }`}>
                          {portfolio.category === "conservative" ? "Cons" : portfolio.category === "balanced" ? "Bil" : "Aggr"}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{portfolio.author}</span>
                      
                      {/* Piccola barra di allocazione */}
                      <div className="flex h-1.5 w-full bg-muted/60 rounded-full overflow-hidden mt-3">
                        <div className="bg-teal-500" style={{ width: `${portfolio.allocation.stocks}%` }} title={`Azioni: ${portfolio.allocation.stocks}%`} />
                        <div className="bg-indigo-500" style={{ width: `${portfolio.allocation.bonds}%` }} title={`Obbligazioni: ${portfolio.allocation.bonds}%`} />
                        <div className="bg-amber-500" style={{ width: `${portfolio.allocation.commodities}%` }} title={`Materie Prime: ${portfolio.allocation.commodities}%`} />
                        <div className="bg-slate-400" style={{ width: `${portfolio.allocation.cash}%` }} title={`Liquidità: ${portfolio.allocation.cash}%`} />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                        <span>Azioni: {portfolio.allocation.stocks}%</span>
                        <span>Bond: {portfolio.allocation.bonds}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Dettagli Allocazione Visiva */}
          <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Coins className="size-4 text-emerald-500" /> Composizione Asset Class
              </h3>
              
              <div className="space-y-3">
                {/* Azioni */}
                {selectedPortfolio.allocation.stocks > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-teal-500 rounded-full inline-block" /> Azionario
                      </span>
                      <span>{selectedPortfolio.allocation.stocks}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${selectedPortfolio.allocation.stocks}%` }} />
                    </div>
                  </div>
                )}

                {/* Obbligazioni */}
                {selectedPortfolio.allocation.bonds > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block" /> Obbligazionario
                      </span>
                      <span>{selectedPortfolio.allocation.bonds}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${selectedPortfolio.allocation.bonds}%` }} />
                    </div>
                  </div>
                )}

                {/* Oro / Commodities */}
                {selectedPortfolio.allocation.commodities > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" /> Commodities / Oro
                      </span>
                      <span>{selectedPortfolio.allocation.commodities}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedPortfolio.allocation.commodities}%` }} />
                    </div>
                  </div>
                )}

                {/* Liquidità */}
                {selectedPortfolio.allocation.cash > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 bg-slate-400 rounded-full inline-block" /> Liquidità a breve
                      </span>
                      <span>{selectedPortfolio.allocation.cash}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: `${selectedPortfolio.allocation.cash}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Indicazione del TER */}
              <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-2xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">TER Medio USD</p>
                  <p className="font-extrabold text-foreground mt-0.5">{selectedPortfolio.terUsd.toFixed(3)}%</p>
                </div>
                <div className="p-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">TER Medio EUR</p>
                  <p className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedPortfolio.terEur.toFixed(3)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonna di destra: Dettagli portafoglio, ETF storici, e Simulatore */}
        <div className="space-y-6 lg:col-span-8">
          
          {/* Scheda riepilogo portafoglio */}
          <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-2xl font-black text-foreground">{selectedPortfolio.name}</h2>
                  <div className="text-xs text-muted-foreground">
                    Autore: <span className="font-bold text-foreground">{selectedPortfolio.author}</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{selectedPortfolio.description}</p>
              </div>

              {/* Sezione ETF Costituenti */}
              <div className="space-y-3 pt-3 border-t border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <BookOpen className="size-4 text-emerald-500" /> ETF in Portafoglio
                  </h4>
                  {/* Toggle Valuta */}
                  <div className="inline-flex rounded-xl bg-muted/60 p-0.5 text-xs">
                    <button
                      onClick={() => setEtfCurrency("EUR")}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all ${
                        etfCurrency === "EUR" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> EUR (Armonizzati UCITS)
                    </button>
                    <button
                      onClick={() => setEtfCurrency("USD")}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all ${
                        etfCurrency === "USD" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      USD (Originali USA)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-border/60 bg-muted/15">
                  <table className="w-full text-xs text-left min-w-[500px]">
                    <thead className="bg-muted/40 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="px-4 py-2">Ticker</th>
                        <th className="px-4 py-2">ISIN</th>
                        <th className="px-4 py-2">Nome ETF</th>
                        <th className="px-4 py-2 text-right">Peso</th>
                        <th className="px-4 py-2 text-right">TER</th>
                        <th className="px-4 py-2">Ruolo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {(etfCurrency === "EUR" ? selectedPortfolio.etfsEur : selectedPortfolio.etfsUsd).map((etf, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-4 py-2.5 font-bold text-foreground">{etf.ticker}</td>
                          <td className="px-4 py-2.5 text-muted-foreground font-mono">{etf.isin}</td>
                          <td className="px-4 py-2.5 text-foreground max-w-[150px] truncate" title={etf.name}>{etf.name}</td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-teal-600 dark:text-teal-400">{etf.weight}%</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{etf.ter.toFixed(2)}%</td>
                          <td className="px-4 py-2.5 text-muted-foreground line-clamp-1 max-w-[120px]">{etf.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal italic flex items-start gap-1">
                  <Info className="size-3 mt-0.5 shrink-0 text-emerald-500" />
                  Visualizzando gli ETF {currencyLabel}. Gli ETF in EUR sono repliche UCITS armonizzate acquistabili in Italia (su Borsa Italiana) per eliminare rischi fiscali derivanti da ETF USA.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scheda Statistiche storiche e Rischio di Cambio */}
          <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
                <h3 className="font-extrabold text-foreground text-md flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-500" /> Performance Storica e Cambi
                </h3>
                {/* Selettore Periodo */}
                <div className="inline-flex rounded-xl bg-muted/65 p-0.5 text-xs font-semibold">
                  {(["1985-2020", "2000-2020", "2010-2020"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1.5 rounded-lg transition-colors ${selectedPeriod === period ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side-by-Side statistiche USD, USD->EUR, EUR */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* 1. USD originali */}
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> In Dollari (USD)
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal -mt-1 italic">Rendimento per un investitore americano.</p>
                  <div className="space-y-1.5 text-sm pt-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Rendimento Annuo:</span> <span className="font-bold text-foreground">{formatPct(currentPeriodStats.usd.returnPct)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Volatilità:</span> <span className="font-bold text-foreground">{formatPct(currentPeriodStats.usd.stdDevPct)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sharpe Ratio:</span> <span className="font-bold text-foreground">{currentPeriodStats.usd.sharpeRatio.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Max Drawdown:</span> <span className="font-bold text-rose-500">-{formatPct(currentPeriodStats.usd.maxDrawdownPct)}</span></div>
                  </div>
                </div>

                {/* 2. USD convertito in EUR */}
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-3 relative">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> USD → EUR
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal -mt-1 italic">ETF in USD convertiti in EUR (impatto cambio).</p>
                  <div className="space-y-1.5 text-sm pt-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Rendimento Annuo:</span> <span className="font-bold text-foreground">{formatPct(currentPeriodStats.usdToEur.returnPct)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Volatilità:</span> <span className="font-bold text-rose-600 dark:text-red-300">{formatPct(currentPeriodStats.usdToEur.stdDevPct)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sharpe Ratio:</span> <span className="font-bold text-foreground">{currentPeriodStats.usdToEur.sharpeRatio.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Max Drawdown:</span> <span className="font-bold text-rose-600">-{formatPct(currentPeriodStats.usdToEur.maxDrawdownPct)}</span></div>
                  </div>
                </div>

                {/* 3. EUR puro */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> In Euro (EUR)
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal -mt-1 italic">ETF focalizzati su area Euro o coperti valutariamente.</p>
                  <div className="space-y-1.5 text-sm pt-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Rendimento Annuo:</span> <span className="font-bold text-foreground">{formatPct(currentPeriodStats.eur.returnPct)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Volatilità:</span> <span className="font-bold text-foreground">{formatPct(currentPeriodStats.eur.stdDevPct)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sharpe Ratio:</span> <span className="font-bold text-foreground">{currentPeriodStats.eur.sharpeRatio.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Max Drawdown:</span> <span className="font-bold text-rose-500">-{formatPct(currentPeriodStats.eur.maxDrawdownPct)}</span></div>
                  </div>
                </div>
              </div>

              {/* Messaggio educativo sul rischio di cambio */}
              <div className="rounded-2xl bg-amber-500/5 border border-amber-500/10 p-3.5 flex gap-3 text-xs leading-normal">
                <ArrowRightLeft className="size-5 shrink-0 text-amber-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-700 dark:text-amber-400">Evidenza Educativa: L&apos;impatto del Rischio di Cambio (USD vs USD→EUR)</p>
                  <p className="text-muted-foreground">
                    Confrontando la colonna <strong className="text-foreground">USD</strong> con la colonna <strong className="text-foreground">USD→EUR</strong>, si nota come per gli investitori europei l&apos;acquisto di ETF in dollari non protetti aumenti notevolmente la volatilità e i drawdown storici (ad esempio, nel 1985-2020 la volatilità del Golden Butterfly sale da 7.67% a 12.95%). La colonna <strong className="text-foreground">EUR</strong> mostra invece come un asset allocation adattata localmente riesca a ristabilire il controllo del rischio eliminando il rischio di cambio.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Simulatore di Decumulo / SWR con Monte Carlo */}
          <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="border-b border-border/60 pb-3">
                <h3 className="font-extrabold text-foreground text-md flex items-center gap-2">
                  <Play className="size-4 text-emerald-500" /> Simulatore Interattivo Monte Carlo e SWR
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Simula l&apos;andamento del portafoglio nel tempo durante la fase di prelievo (rendita) in base alla volatilità e rendimento reali dell&apos;asset allocation EUR selezionata.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-12">
                {/* Inputs del simulatore */}
                <div className="space-y-4 md:col-span-5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    Parametri di Rendita
                  </h4>

                  {/* Capitale Iniziale */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Capitale Accumulato</Label>
                    <Input
                      type="number"
                      min="10000"
                      step="10000"
                      value={initialCapital}
                      onChange={(e) => setInitialCapital(Math.max(10000, Number(e.target.value)))}
                      className="min-h-10 border-emerald-200 bg-emerald-50/40 text-md font-bold text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300"
                    />
                    <Slider value={[initialCapital]} min={50000} max={1500000} step={25000} onValueChange={(value) => setInitialCapital(value[0])} />
                  </div>

                  {/* Prelievo Annuo (%) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase">
                      <Label className="text-[11px] font-bold">Prelievo Annuo (SWR)</Label>
                      <span className="text-teal-600 dark:text-teal-400">{withdrawalRatePct.toFixed(1)}%</span>
                    </div>
                    <Slider value={[withdrawalRatePct]} min={1} max={12} step={0.1} onValueChange={(value) => setWithdrawalRatePct(value[0])} />
                    <p className="text-[10px] text-muted-foreground -mt-1 leading-normal">
                      Equivale a un prelievo mensile iniziale di <strong className="text-foreground">{formatEuro((initialCapital * (withdrawalRatePct / 100)) / 12)}/mese</strong> (in euro reali di oggi).
                    </p>
                  </div>

                  {/* Orizzonte temporale */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase">
                      <Label className="text-[11px] font-bold">Orizzonte di Rendita</Label>
                      <span className="text-indigo-600 dark:text-indigo-400">{withdrawalYears} anni</span>
                    </div>
                    <Slider value={[withdrawalYears]} min={10} max={50} step={1} onValueChange={(value) => setWithdrawalYears(value[0])} />
                  </div>

                  {/* Inflazione Attesa (%) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase">
                      <Label className="text-[11px] font-bold">Inflazione Attesa</Label>
                      <span className="text-amber-600 dark:text-amber-400">{inflationRatePct.toFixed(1)}%</span>
                    </div>
                    <Slider value={[inflationRatePct]} min={0} max={8} step={0.1} onValueChange={(value) => setInflationRatePct(value[0])} />
                    <p className="text-[10px] text-muted-foreground -mt-1 leading-normal">
                      Necessaria per calcolare i rendimenti reali e mantenere il prelievo costante in termini di potere d&apos;acquisto (euro reali).
                    </p>
                  </div>

                  {/* Contributi mensili extra */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Entrate mensili aggiuntive (es. pensione/lavoro)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Math.max(0, Number(e.target.value)))}
                      className="min-h-10 border-blue-200 bg-blue-50/40 text-md font-bold text-blue-800 dark:border-blue-950 dark:bg-blue-950/20 dark:text-blue-300"
                    />
                    <p className="text-[10px] text-muted-foreground italic leading-normal">
                      Inserisci eventuali rendite pensionistiche o entrate per coprire parte delle spese riducendo il decumulo.
                    </p>
                  </div>
                </div>

                {/* KPI e Grafico simulatore */}
                <div className="space-y-6 md:col-span-7">
                  
                  {/* Indicatori di successo */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    
                    {/* Probabilità di successo */}
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-center">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tasso di Successo</div>
                      <div className={`text-3xl font-extrabold ${
                        mcResult.successRate >= 90 
                          ? "text-emerald-600 dark:text-emerald-400"
                          : mcResult.successRate >= 75
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-rose-500"
                      }`}>
                        {mcResult.successRate.toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">2000 runs Monte Carlo</div>
                    </div>

                    {/* SWR Ottimale (95% successo) */}
                    <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-center dark:border-teal-950 dark:bg-teal-950/20">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">SWR Storico Ottimale</div>
                      <div className="text-3xl font-extrabold text-teal-700 dark:text-teal-300">
                        {mcResult.swr95.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-teal-600/80 dark:text-teal-400/80 mt-1">
                        Massimo prelievo al 95% di successo: <strong className="font-semibold text-foreground">{formatEuro((initialCapital * (mcResult.swr95 / 100)) / 12)}/mese</strong>
                      </div>
                    </div>
                  </div>

                  {/* Grafico dei percentili capitali */}
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Proiezioni di Capitale (Percentili 10°, 50° e 90°)
                    </h5>
                    <div className="h-[200px] w-full rounded-2xl border border-border/60 bg-muted/10 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mcResult.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="anno" {...CHART_AXIS_PROPS} />
                          <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatCompactEuroAxis} />
                          <RechartsTooltip
                            contentStyle={CHART_TOOLTIP_STYLE}
                            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                            cursor={CHART_CURSOR}
                            formatter={(value: number | string | undefined) => [formatEuro(Number(value ?? 0)), undefined]}
                          />
                          <Area type="monotone" dataKey="p90" name="Scenario Ottimista (90°)" stroke={CHART_COLORS.wealth} fill={CHART_COLORS.wealth} fillOpacity={0.06} strokeWidth={1.5} />
                          <Area type="monotone" dataKey="p50" name="Scenario Mediano (50°)" stroke={CHART_COLORS.capital} fill={CHART_COLORS.capital} fillOpacity={0.08} strokeWidth={2} />
                          <Area type="monotone" dataKey="p10" name="Scenario Avverso (10°)" stroke={CHART_COLORS.negative} fill={CHART_COLORS.negative} fillOpacity={0.06} strokeWidth={1.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground italic leading-normal">
                      <span>Lo scenario avverso (10° percentile) indica che solo il 10% delle simulazioni ha fatto peggio.</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
