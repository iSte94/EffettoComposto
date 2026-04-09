"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/format";
import {
  Upload, FileText, TrendingUp, TrendingDown, ArrowDownUp,
  Wallet, Receipt, PiggyBank, BarChart3, ArrowUpRight,
  ArrowDownRight, Filter, Search, CalendarDays, Coins,
  BadgePercent, X, ChevronDown, ChevronUp, Building2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
  Legend, ComposedChart, Line,
} from "recharts";

// ---------- Types ----------

interface DirectaMovement {
  dataOperazione: Date;
  dataValuta: Date;
  tipoOperazione: string;
  ticker: string;
  isin: string;
  protocollo: string;
  descrizione: string;
  quantita: number;
  importoEuro: number;
  importoDivisa: number;
  divisa: string;
  riferimentoOrdine: string;
}

interface ParsedData {
  accountName: string;
  extractionDate: string;
  movements: DirectaMovement[];
}

// ---------- Parsing ----------

function parseDate(s: string): Date {
  const [d, m, y] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function parseDirectaCsv(text: string): ParsedData {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let accountName = "";
  let extractionDate = "";
  const movements: DirectaMovement[] = [];
  let headerFound = false;

  for (const line of lines) {
    if (!headerFound) {
      if (line.startsWith("Conto :")) {
        accountName = line.split(":")[1]?.split(",")[0]?.trim() ?? "";
      }
      if (line.startsWith("Data estrazione :")) {
        extractionDate = line.split(":").slice(1).join(":").split(",")[0]?.trim() ?? "";
      }
      if (line.startsWith("Data operazione,")) {
        headerFound = true;
      }
      continue;
    }

    const cols = parseCsvLine(line);
    if (cols.length < 9 || !cols[0] || !cols[0].includes("-")) continue;

    const importoEuro = parseFloat(cols[8]) || 0;
    const importoDivisa = parseFloat(cols[9]) || 0;

    movements.push({
      dataOperazione: parseDate(cols[0]),
      dataValuta: parseDate(cols[1]),
      tipoOperazione: cols[2] || "",
      ticker: cols[3] || "",
      isin: cols[4] || "",
      protocollo: cols[5] || "",
      descrizione: cols[6] || "",
      quantita: parseFloat(cols[7]) || 0,
      importoEuro,
      importoDivisa,
      divisa: cols[10] || "EUR",
      riferimentoOrdine: cols[11] || "",
    });
  }

  return { accountName, extractionDate, movements };
}

// ---------- Helpers ----------

const OP_CATEGORIES: Record<string, string[]> = {
  "Acquisti": ["Acquisto"],
  "Vendite": ["Vendita"],
  "Conferimenti": ["Conferimento con bonifico"],
  "Prelievi": ["Prelievo bonifico"],
  "Commissioni": ["Commissioni"],
  "Tasse & Ritenute": [
    "Rit. etf", "Rit.cedola obb.", "Rit.ratei att.obb.", "Ritenuta dividendi esteri",
    "Ritenuta dividendi italia", "Rit.div.usa", "Ritenuta su plusvalenza",
    "Rit.provento etf", "Rit.int.prestito titoli", "Tobin tax italia",
    "Bollo portafoglio titoli*",
  ],
  "Dividendi & Cedole": [
    "Coupon certif.", "Cedola obb.", "Incasso dividendi esteri",
    "Incasso dividendi italia", "Incasso dividendi usa", "Provento etf",
    "Interessi prest.titoli",
  ],
  "Altro": [],
};

function categorize(tipo: string): string {
  for (const [cat, types] of Object.entries(OP_CATEGORIES)) {
    if (cat === "Altro") continue;
    if (types.some((t) => tipo.startsWith(t) || tipo === t)) return cat;
  }
  return "Altro";
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${months[parseInt(m!) - 1]} ${y!.slice(2)}`;
}

const PIE_COLORS = [
  "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#14b8a6",
  "#a855f7", "#64748b",
];

const fmtEuro = (v: number) => formatEuro(Math.round(v));
const fmtEuroSigned = (v: number) => (v >= 0 ? "+" : "") + formatEuro(Math.round(v));

// ---------- Sub-components ----------

function KpiCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string; color: string; sub?: string;
}) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2 ${color}`}>
            <Icon className="size-4.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, icon: Icon, children, className = "" }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={`border-border/60 bg-card/80 backdrop-blur-sm shadow-sm ${className}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="size-4.5 text-emerald-500" />
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-lg backdrop-blur-sm text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{fmtEuro(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Main Component ----------

export function DirectaMovementsViewer() {
  const [data, setData] = useState<ParsedData | null>(null);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterTicker, setFilterTicker] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [tableSort, setTableSort] = useState<{ col: string; asc: boolean }>({ col: "data", asc: false });

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseDirectaCsv(text);
      setData(parsed);
      setFilterYear("all");
      setFilterTicker("all");
      setFilterType("all");
      setSearchText("");
    };
    reader.readAsText(file, "utf-8");
  }, []);

  // Derived data
  const years = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.movements.map((m) => m.dataOperazione.getFullYear()));
    return Array.from(s).sort((a, b) => b - a);
  }, [data]);

  const tickers = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.movements.filter((m) => m.ticker).map((m) => m.ticker));
    return Array.from(s).sort();
  }, [data]);

  const filteredMovements = useMemo(() => {
    if (!data) return [];
    return data.movements.filter((m) => {
      if (filterYear !== "all" && m.dataOperazione.getFullYear() !== parseInt(filterYear)) return false;
      if (filterTicker !== "all" && m.ticker !== filterTicker) return false;
      if (filterType !== "all" && categorize(m.tipoOperazione) !== filterType) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        return (
          m.descrizione.toLowerCase().includes(q) ||
          m.ticker.toLowerCase().includes(q) ||
          m.tipoOperazione.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, filterYear, filterTicker, filterType, searchText]);

  // KPIs
  const kpis = useMemo(() => {
    const mvs = filteredMovements;
    const conferimenti = mvs.filter((m) => m.tipoOperazione === "Conferimento con bonifico").reduce((s, m) => s + m.importoEuro, 0);
    const prelievi = mvs.filter((m) => m.tipoOperazione === "Prelievo bonifico").reduce((s, m) => s + m.importoEuro, 0);
    const acquisti = mvs.filter((m) => m.tipoOperazione === "Acquisto").reduce((s, m) => s + m.importoEuro, 0);
    const vendite = mvs.filter((m) => m.tipoOperazione === "Vendita").reduce((s, m) => s + m.importoEuro, 0);
    const commissioni = mvs.filter((m) => m.tipoOperazione === "Commissioni").reduce((s, m) => s + m.importoEuro, 0);
    const tasse = mvs.filter((m) => categorize(m.tipoOperazione) === "Tasse & Ritenute").reduce((s, m) => s + m.importoEuro, 0);
    const dividendi = mvs.filter((m) => categorize(m.tipoOperazione) === "Dividendi & Cedole").reduce((s, m) => s + m.importoEuro, 0);
    const netCashFlow = mvs.reduce((s, m) => s + m.importoEuro, 0);
    const numOperazioni = mvs.length;
    const primo = mvs.length ? mvs[mvs.length - 1]!.dataOperazione : null;
    const ultimo = mvs.length ? mvs[0]!.dataOperazione : null;

    return { conferimenti, prelievi, acquisti, vendite, commissioni, tasse, dividendi, netCashFlow, numOperazioni, primo, ultimo };
  }, [filteredMovements]);

  // Monthly cash flow chart
  const monthlyData = useMemo(() => {
    const map = new Map<string, { conferimenti: number; prelievi: number; acquisti: number; vendite: number; netto: number }>();
    for (const m of filteredMovements) {
      const mk = monthKey(m.dataOperazione);
      const entry = map.get(mk) ?? { conferimenti: 0, prelievi: 0, acquisti: 0, vendite: 0, netto: 0 };
      if (m.tipoOperazione === "Conferimento con bonifico") entry.conferimenti += m.importoEuro;
      else if (m.tipoOperazione === "Prelievo bonifico") entry.prelievi += Math.abs(m.importoEuro);
      else if (m.tipoOperazione === "Acquisto") entry.acquisti += Math.abs(m.importoEuro);
      else if (m.tipoOperazione === "Vendita") entry.vendite += m.importoEuro;
      entry.netto += m.importoEuro;
      map.set(mk, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({ month: monthLabel(key), ...val }));
  }, [filteredMovements]);

  // Cumulative conferimenti over time
  const cumulativeData = useMemo(() => {
    const sorted = [...filteredMovements].sort((a, b) => a.dataOperazione.getTime() - b.dataOperazione.getTime());
    const map = new Map<string, { conferimenti: number; investito: number; dividendi: number }>();
    let cumConf = 0;
    let cumInv = 0;
    let cumDiv = 0;
    for (const m of sorted) {
      const mk = monthKey(m.dataOperazione);
      if (m.tipoOperazione === "Conferimento con bonifico") cumConf += m.importoEuro;
      else if (m.tipoOperazione === "Prelievo bonifico") cumConf += m.importoEuro;
      if (m.tipoOperazione === "Acquisto") cumInv += Math.abs(m.importoEuro);
      if (categorize(m.tipoOperazione) === "Dividendi & Cedole") cumDiv += m.importoEuro;
      map.set(mk, { conferimenti: cumConf, investito: cumInv, dividendi: cumDiv });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({ month: monthLabel(key), ...val }));
  }, [filteredMovements]);

  // By ticker breakdown (top invested)
  const tickerBreakdown = useMemo(() => {
    const map = new Map<string, { investito: number; ricavato: number; descrizione: string; qty: number }>();
    for (const m of filteredMovements) {
      if (!m.ticker || m.ticker.startsWith("LX.")) continue;
      const entry = map.get(m.ticker) ?? { investito: 0, ricavato: 0, descrizione: m.descrizione, qty: 0 };
      if (!entry.descrizione && m.descrizione) entry.descrizione = m.descrizione;
      if (m.tipoOperazione === "Acquisto") {
        entry.investito += Math.abs(m.importoEuro);
        entry.qty += m.quantita;
      } else if (m.tipoOperazione === "Vendita") {
        entry.ricavato += m.importoEuro;
        entry.qty -= m.quantita;
      }
      map.set(m.ticker, entry);
    }
    return Array.from(map.entries())
      .map(([ticker, val]) => ({ ticker, ...val, pl: val.ricavato - val.investito }))
      .sort((a, b) => b.investito - a.investito);
  }, [filteredMovements]);

  // Ranking: only closed positions (ricavato > 0), sorted by % return
  const tickerRanking = useMemo(() => {
    return tickerBreakdown
      .filter((t) => t.ricavato > 0 && t.investito > 0)
      .map((t) => ({ ...t, pctReturn: ((t.ricavato - t.investito) / t.investito) * 100 }))
      .sort((a, b) => b.pctReturn - a.pctReturn);
  }, [tickerBreakdown]);

  // P/L totals
  const plSummary = useMemo(() => {
    const closed = tickerBreakdown.filter((t) => t.ricavato > 0 && t.investito > 0);
    const totalGain = closed.filter((t) => t.pl >= 0).reduce((s, t) => s + t.pl, 0);
    const totalLoss = closed.filter((t) => t.pl < 0).reduce((s, t) => s + t.pl, 0);
    const totalInvested = closed.reduce((s, t) => s + t.investito, 0);
    const totalReturned = closed.reduce((s, t) => s + t.ricavato, 0);
    const netPL = totalReturned - totalInvested;
    const pctReturn = totalInvested > 0 ? ((totalReturned - totalInvested) / totalInvested) * 100 : 0;
    return { totalGain, totalLoss, netPL, totalInvested, totalReturned, pctReturn, count: closed.length };
  }, [tickerBreakdown]);

  // Pie chart for operation categories
  const categoryPie = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of filteredMovements) {
      const cat = categorize(m.tipoOperazione);
      if (cat === "Conferimenti" || cat === "Prelievi") continue;
      map.set(cat, (map.get(cat) ?? 0) + Math.abs(m.importoEuro));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredMovements]);

  // Yearly summary
  const yearlySummary = useMemo(() => {
    const map = new Map<number, { conferimenti: number; acquisti: number; vendite: number; commissioni: number; tasse: number; dividendi: number }>();
    for (const m of filteredMovements) {
      const y = m.dataOperazione.getFullYear();
      const entry = map.get(y) ?? { conferimenti: 0, acquisti: 0, vendite: 0, commissioni: 0, tasse: 0, dividendi: 0 };
      if (m.tipoOperazione === "Conferimento con bonifico") entry.conferimenti += m.importoEuro;
      else if (m.tipoOperazione === "Prelievo bonifico") entry.conferimenti += m.importoEuro;
      else if (m.tipoOperazione === "Acquisto") entry.acquisti += Math.abs(m.importoEuro);
      else if (m.tipoOperazione === "Vendita") entry.vendite += m.importoEuro;
      else if (m.tipoOperazione === "Commissioni") entry.commissioni += Math.abs(m.importoEuro);
      else if (categorize(m.tipoOperazione) === "Tasse & Ritenute") entry.tasse += Math.abs(m.importoEuro);
      else if (categorize(m.tipoOperazione) === "Dividendi & Cedole") entry.dividendi += m.importoEuro;
      map.set(y, entry);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([year, val]) => ({ anno: year.toString(), ...val }));
  }, [filteredMovements]);

  // Sorted table
  const sortedTableMovements = useMemo(() => {
    const arr = [...filteredMovements];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (tableSort.col) {
        case "data": cmp = a.dataOperazione.getTime() - b.dataOperazione.getTime(); break;
        case "tipo": cmp = a.tipoOperazione.localeCompare(b.tipoOperazione); break;
        case "ticker": cmp = a.ticker.localeCompare(b.ticker); break;
        case "importo": cmp = a.importoEuro - b.importoEuro; break;
        case "quantita": cmp = a.quantita - b.quantita; break;
      }
      return tableSort.asc ? cmp : -cmp;
    });
    return arr;
  }, [filteredMovements, tableSort]);

  const toggleSort = (col: string) => {
    setTableSort((prev) => prev.col === col ? { col, asc: !prev.asc } : { col, asc: true });
  };

  // ---------- Render ----------

  if (!data) {
    return (
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardContent className="py-16 flex flex-col items-center gap-5">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 p-5 border border-emerald-500/20">
            <Upload className="size-10 text-emerald-500" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold">Importa Movimenti Directa</h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Carica il file CSV dei movimenti scaricato da Directa Trading per visualizzare
              un&apos;analisi completa dello storico operazioni.
            </p>
          </div>
          <label className="cursor-pointer">
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95">
              <FileText className="size-4" />
              Seleziona file CSV
            </div>
          </label>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (d: Date) => d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  const period = kpis.primo && kpis.ultimo
    ? `${formatDate(kpis.primo)} - ${formatDate(kpis.ultimo)}`
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 p-2.5 shadow-md shadow-emerald-500/20">
                <BarChart3 className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold">Movimenti Directa</h3>
                <p className="text-xs text-muted-foreground">
                  {data.movements.length} operazioni &middot; {period}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-accent">
                  <Upload className="size-3.5" />
                  Cambia file
                </div>
              </label>
              <Button variant="ghost" size="sm" onClick={() => setData(null)} className="text-xs h-8 gap-1">
                <X className="size-3.5" />
                Chiudi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtri</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Anno" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli anni</SelectItem>
                {years.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterTicker} onValueChange={setFilterTicker}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Ticker" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i ticker</SelectItem>
                {tickers.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {Object.keys(OP_CATEGORIES).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cerca..."
                className="h-9 text-xs pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={PiggyBank} label="Conferimenti netti"
          value={fmtEuro(kpis.conferimenti + kpis.prelievi)}
          color="bg-emerald-500"
          sub={`${fmtEuro(kpis.conferimenti)} versati, ${fmtEuro(Math.abs(kpis.prelievi))} prelevati`}
        />
        <KpiCard
          icon={ArrowDownRight} label="Totale acquisti"
          value={fmtEuro(Math.abs(kpis.acquisti))}
          color="bg-blue-500"
          sub={`${filteredMovements.filter((m) => m.tipoOperazione === "Acquisto").length} operazioni`}
        />
        <KpiCard
          icon={ArrowUpRight} label="Totale vendite"
          value={fmtEuro(kpis.vendite)}
          color="bg-violet-500"
          sub={`${filteredMovements.filter((m) => m.tipoOperazione === "Vendita").length} operazioni`}
        />
        <KpiCard
          icon={Coins} label="Dividendi & Cedole"
          value={fmtEuro(kpis.dividendi)}
          color="bg-amber-500"
          sub={`${filteredMovements.filter((m) => categorize(m.tipoOperazione) === "Dividendi & Cedole").length} incassi`}
        />
        <KpiCard
          icon={Receipt} label="Commissioni totali"
          value={fmtEuro(Math.abs(kpis.commissioni))}
          color="bg-rose-500"
        />
        <KpiCard
          icon={BadgePercent} label="Tasse & Ritenute"
          value={fmtEuro(Math.abs(kpis.tasse))}
          color="bg-orange-500"
        />
        <KpiCard
          icon={ArrowDownUp} label="Operazioni"
          value={kpis.numOperazioni.toLocaleString("it-IT")}
          color="bg-cyan-500"
          sub={period}
        />
        <KpiCard
          icon={Wallet} label="Flusso netto conto"
          value={fmtEuroSigned(kpis.netCashFlow)}
          color={kpis.netCashFlow >= 0 ? "bg-emerald-500" : "bg-rose-500"}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cumulative */}
        <ChartCard title="Andamento cumulativo" icon={TrendingUp}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <defs>
                  <linearGradient id="gConf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDiv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="conferimenti" name="Conf. netti" stroke="#10b981" fill="url(#gConf)" strokeWidth={2} />
                <Area type="monotone" dataKey="investito" name="Investito cum." stroke="#6366f1" fill="url(#gInv)" strokeWidth={2} />
                <Area type="monotone" dataKey="dividendi" name="Dividendi cum." stroke="#f59e0b" fill="url(#gDiv)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Monthly bar */}
        <ChartCard title="Flussi mensili" icon={CalendarDays}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="conferimenti" name="Conferimenti" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="vendite" name="Vendite" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="acquisti" name="Acquisti" fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="prelievi" name="Prelievi" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category pie */}
        <ChartCard title="Distribuzione operazioni" icon={BarChart3}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPie}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {categoryPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtEuro(v as number)} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Yearly summary */}
        <ChartCard title="Riepilogo annuale" icon={CalendarDays} className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearlySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="anno" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="conferimenti" name="Conf. netti" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="acquisti" name="Acquisti" fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="vendite" name="Vendite" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey="dividendi" name="Dividendi" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* P/L Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={TrendingUp} label="Guadagni totali"
          value={fmtEuroSigned(plSummary.totalGain)}
          color="bg-emerald-500"
          sub={`da ${plSummary.count} posizioni chiuse`}
        />
        <KpiCard
          icon={TrendingDown} label="Perdite totali"
          value={fmtEuro(Math.abs(plSummary.totalLoss))}
          color="bg-rose-500"
        />
        <KpiCard
          icon={Wallet} label="P/L netto"
          value={fmtEuroSigned(plSummary.netPL)}
          color={plSummary.netPL >= 0 ? "bg-emerald-500" : "bg-rose-500"}
          sub={`${plSummary.pctReturn >= 0 ? "+" : ""}${plSummary.pctReturn.toFixed(1)}% sul capitale chiuso`}
        />
        <KpiCard
          icon={ArrowDownUp} label="Capitale chiuso"
          value={fmtEuro(plSummary.totalInvested)}
          color="bg-indigo-500"
          sub={`ricavato ${fmtEuro(plSummary.totalReturned)}`}
        />
      </div>

      {/* Classifica investimenti */}
      {tickerRanking.length > 0 && (
        <ChartCard title="Classifica investimenti (dal migliore al peggiore)" icon={TrendingUp}>
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="px-4 sm:px-5 py-2.5 font-semibold text-muted-foreground w-8">#</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground">Ticker</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground">Descrizione</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground text-right">Investito</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground text-right">Ricavato</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground text-right">P/L</th>
                  <th className="px-4 sm:px-5 py-2.5 font-semibold text-muted-foreground text-right">Rendimento %</th>
                </tr>
              </thead>
              <tbody>
                {tickerRanking.map((t, i) => (
                  <tr key={t.ticker} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="px-4 sm:px-5 py-2.5 font-bold text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono font-bold text-xs bg-muted/50 rounded px-1.5 py-0.5">{t.ticker}</span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-48 truncate">{t.descrizione}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{fmtEuro(t.investito)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{fmtEuro(t.ricavato)}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${t.pl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      {fmtEuroSigned(t.pl)}
                    </td>
                    <td className={`px-4 sm:px-5 py-2.5 text-right font-bold ${t.pctReturn >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                      <div className="flex items-center justify-end gap-1.5">
                        {t.pctReturn >= 0
                          ? <ArrowUpRight className="size-3.5" />
                          : <ArrowDownRight className="size-3.5" />
                        }
                        {t.pctReturn >= 0 ? "+" : ""}{t.pctReturn.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Ticker breakdown */}
      <ChartCard title={`Dettaglio per strumento (${tickerBreakdown.length})`} icon={Building2}>
        <div className="overflow-x-auto -mx-4 sm:-mx-5">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="px-4 sm:px-5 py-2.5 font-semibold text-muted-foreground">Ticker</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground">Descrizione</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground text-right">Investito</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground text-right">Ricavato</th>
                <th className="px-3 py-2.5 font-semibold text-muted-foreground text-right">P/L</th>
                <th className="px-4 sm:px-5 py-2.5 font-semibold text-muted-foreground text-right">Qt. residua</th>
              </tr>
            </thead>
            <tbody>
              {tickerBreakdown.map((t) => (
                <tr key={t.ticker} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-4 sm:px-5 py-2.5">
                    <span className="font-mono font-bold text-xs bg-muted/50 rounded px-1.5 py-0.5">{t.ticker}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-48 truncate">{t.descrizione}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{fmtEuro(t.investito)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{fmtEuro(t.ricavato)}</td>
                  <td className={`px-3 py-2.5 text-right font-bold ${t.ricavato > 0 ? (t.pl >= 0 ? "text-emerald-500" : "text-rose-500") : "text-muted-foreground"}`}>
                    {t.ricavato > 0 ? fmtEuroSigned(t.pl) : "-"}
                  </td>
                  <td className="px-4 sm:px-5 py-2.5 text-right font-mono">
                    {t.qty > 0 ? t.qty.toLocaleString("it-IT") : <span className="text-muted-foreground">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Transaction table */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <button
            onClick={() => setShowTable(!showTable)}
            className="flex items-center gap-2 w-full text-left"
          >
            <FileText className="size-4.5 text-emerald-500" />
            <h3 className="text-sm font-bold flex-1">
              Elenco movimenti ({filteredMovements.length.toLocaleString("it-IT")})
            </h3>
            {showTable ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>

          {showTable && (
            <div className="mt-4 overflow-x-auto -mx-4 sm:-mx-5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    {[
                      { key: "data", label: "Data" },
                      { key: "tipo", label: "Tipo" },
                      { key: "ticker", label: "Ticker" },
                      { key: "quantita", label: "Qt.", right: true },
                      { key: "importo", label: "Importo", right: true },
                    ].map((col) => (
                      <th
                        key={col.key}
                        className={`px-3 first:px-4 first:sm:px-5 last:px-4 last:sm:px-5 py-2.5 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none ${col.right ? "text-right" : ""}`}
                        onClick={() => toggleSort(col.key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {tableSort.col === col.key && (
                            tableSort.asc ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 sm:px-5 py-2.5 font-semibold text-muted-foreground">Descrizione</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTableMovements.slice(0, 200).map((m, i) => {
                    const cat = categorize(m.tipoOperazione);
                    const colorClass = cat === "Acquisti" ? "text-blue-500" :
                      cat === "Vendite" ? "text-violet-500" :
                      cat === "Conferimenti" ? "text-emerald-500" :
                      cat === "Prelievi" ? "text-rose-500" :
                      cat === "Commissioni" ? "text-rose-400" :
                      cat === "Tasse & Ritenute" ? "text-orange-400" :
                      cat === "Dividendi & Cedole" ? "text-amber-500" :
                      "text-muted-foreground";
                    return (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <td className="px-4 sm:px-5 py-2 font-mono text-muted-foreground whitespace-nowrap">
                          {formatDate(m.dataOperazione)}
                        </td>
                        <td className={`px-3 py-2 font-medium whitespace-nowrap ${colorClass}`}>
                          {m.tipoOperazione}
                        </td>
                        <td className="px-3 py-2">
                          {m.ticker && (
                            <span className="font-mono font-bold text-[11px] bg-muted/50 rounded px-1.5 py-0.5">{m.ticker}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {m.quantita ? m.quantita.toLocaleString("it-IT") : ""}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${m.importoEuro >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                          {fmtEuroSigned(m.importoEuro)}
                        </td>
                        <td className="px-4 sm:px-5 py-2 text-muted-foreground max-w-56 truncate">
                          {m.descrizione}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sortedTableMovements.length > 200 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Mostrati i primi 200 di {sortedTableMovements.length.toLocaleString("it-IT")} movimenti
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
