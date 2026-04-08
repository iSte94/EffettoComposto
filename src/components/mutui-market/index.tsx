"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  TrendingDown,
  TrendingUp,
  Clock,
  Award,
  Shield,
  Landmark,
  Info,
  ChevronDown,
  ChevronUp,
  Calculator,
  Loader2,
  AlertTriangle,
  Store,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEuro } from "@/lib/format";
import type { MortgageOffer } from "@/lib/mutui-market/types";

// ── Tipi locali ─────────────────────────────────────────────────────────

type TipoTasso = "F" | "V";
type Durata = 15 | 20 | 30;
type SortField = "taeg" | "tan" | "rata" | "spese";

interface CachedData {
  offerte: MortgageOffer[];
  scrapedAt: string;
}

// ── Calcolo rata francese ───────────────────────────────────────────────

function calcolaRata(importo: number, tanAnnuo: number, anni: number): number {
  if (importo <= 0 || tanAnnuo <= 0 || anni <= 0) return 0;
  const r = tanAnnuo / 100 / 12;
  const n = anni * 12;
  return (importo * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ── Badge per il ranking ────────────────────────────────────────────────

const RankBadge = React.memo(function RankBadge({
  rank,
}: {
  rank: number;
}) {
  if (rank === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-amber-500/30">
        <Award className="size-3" /> #1 Migliore
      </span>
    );
  if (rank === 1)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-slate-300 to-slate-400 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
        #2
      </span>
    );
  if (rank === 2)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-300 to-orange-400 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
        #3
      </span>
    );
  return null;
});

// ── Singola offerta ─────────────────────────────────────────────────────

const OfferCard = React.memo(function OfferCard({
  offer,
  rank,
  importoUtente,
  durataUtente,
}: {
  offer: MortgageOffer;
  rank: number;
  importoUtente: number;
  durataUtente: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const rataRicalcolata = useMemo(
    () => calcolaRata(importoUtente, offer.tan, durataUtente),
    [importoUtente, offer.tan, durataUtente]
  );

  const costoTotale = useMemo(() => {
    return (
      rataRicalcolata * durataUtente * 12 -
      importoUtente +
      offer.speseIstruttoria +
      offer.spesePerizia
    );
  }, [rataRicalcolata, durataUtente, importoUtente, offer]);

  const isBest = rank === 0;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg ${
        isBest
          ? "border-amber-300/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 shadow-md shadow-amber-100/50 dark:border-amber-700/50 dark:from-amber-950/30 dark:via-slate-900 dark:to-amber-950/10 dark:shadow-amber-900/20"
          : "border-slate-200/80 bg-white/75 shadow-sm dark:border-slate-800 dark:bg-slate-900/75"
      } backdrop-blur-sm`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Bank icon */}
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                isBest
                  ? "bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm shadow-amber-500/30"
                  : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-500/20"
              }`}
            >
              <Landmark className="size-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {offer.istituto}
                </h3>
                <RankBadge rank={rank} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {offer.nomeMutuo}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    offer.tipoCanale?.toLowerCase().includes("online")
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                  }`}
                >
                  {offer.tipoCanale?.toLowerCase().includes("online") ? (
                    <Store className="size-2.5" />
                  ) : (
                    <Building2 className="size-2.5" />
                  )}
                  {offer.tipoCanale || "Filiale"}
                </span>
              </div>
            </div>
          </div>

          {/* Rata ricalcolata */}
          <div className="text-right shrink-0">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              La tua rata
            </div>
            <div
              className={`text-xl font-extrabold tracking-tight tabular-nums ${
                isBest
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {formatEuro(rataRicalcolata)}
            </div>
            <div className="text-[10px] text-slate-400">/mese</div>
          </div>
        </div>

        {/* Metriche principali */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-slate-800/50">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              TAN
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {offer.tan.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-slate-800/50">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              TAEG
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {offer.taeg.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-slate-800/50">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Istruttoria
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatEuro(offer.speseIstruttoria)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50/80 px-3 py-2 dark:bg-slate-800/50">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Perizia
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {formatEuro(offer.spesePerizia)}
            </div>
          </div>
        </div>

        {/* Costo totale */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-100/80 to-slate-50/60 px-3 py-2 dark:from-slate-800/60 dark:to-slate-800/30">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Costo totale interessi + spese
          </span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            {formatEuro(costoTotale)}
          </span>
        </div>

        {/* Expand/collapse per dettagli */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
        >
          {isExpanded ? (
            <>
              Nascondi dettagli <ChevronUp className="size-3" />
            </>
          ) : (
            <>
              Dettagli <ChevronDown className="size-3" />
            </>
          )}
        </button>

        {/* Dettagli espansi */}
        {isExpanded && (
          <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 fade-in-50 duration-200">
            {offer.descCalcoloTasso && (
              <div className="rounded-lg bg-blue-50/60 p-3 dark:bg-blue-950/20">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Calcolo tasso
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-blue-800 dark:text-blue-300">
                      {offer.descCalcoloTasso}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {offer.descAssicurazioni && (
              <div className="rounded-lg bg-violet-50/60 p-3 dark:bg-violet-950/20">
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 size-3.5 shrink-0 text-violet-500" />
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      Assicurazioni
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-violet-800 dark:text-violet-300">
                      {offer.descAssicurazioni}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {offer.descSpeseIniziali && (
              <div className="rounded-lg bg-amber-50/60 p-3 dark:bg-amber-950/20">
                <div className="flex items-start gap-2">
                  <Calculator className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Spese iniziali
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                      {offer.descSpeseIniziali}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ── Componente principale ───────────────────────────────────────────────

export function MutuiMarket() {
  // Filtri
  const [tipoTasso, setTipoTasso] = useState<TipoTasso>("F");
  const [durata, setDurata] = useState<Durata>(30);
  const [sortBy, setSortBy] = useState<SortField>("taeg");

  // Input utente per ricalcolo rata
  const [importoUtente, setImportoUtente] = useState(200000);

  // Stato dati
  const [data, setData] = useState<CachedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dati
  const fetchData = useCallback(
    async () => {
      try {
        const res = await fetch(
          `/api/mutui-market?tipoTasso=${tipoTasso}&durata=${durata}`
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.error || `Errore HTTP ${res.status}`
          );
        }

        const result = (await res.json()) as CachedData;
        setData(result);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Errore nel caricamento dei dati"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [tipoTasso, durata]
  );

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  // Offerte ordinate
  const sortedOffers = useMemo(() => {
    if (!data?.offerte) return [];
    return [...data.offerte].sort((a, b) => {
      switch (sortBy) {
        case "tan":
          return a.tan - b.tan;
        case "rata":
          return (
            calcolaRata(importoUtente, a.tan, durata) -
            calcolaRata(importoUtente, b.tan, durata)
          );
        case "spese":
          return (
            a.speseIstruttoria +
            a.spesePerizia -
            (b.speseIstruttoria + b.spesePerizia)
          );
        default:
          return a.taeg - b.taeg;
      }
    });
  }, [data, sortBy, importoUtente, durata]);

  // Timestamp formattato
  const lastUpdated = useMemo(() => {
    if (!data?.scrapedAt) return null;
    return new Date(data.scrapedAt).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [data?.scrapedAt]);

  // Statistiche riassuntive
  const stats = useMemo(() => {
    if (!sortedOffers.length) return null;
    const tans = sortedOffers.map((o) => o.tan);
    const taegs = sortedOffers.map((o) => o.taeg);
    return {
      minTan: Math.min(...tans),
      maxTan: Math.max(...tans),
      minTaeg: Math.min(...taegs),
      bestOffer: sortedOffers[0],
      totalOffers: sortedOffers.length,
    };
  }, [sortedOffers]);

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="text-center space-y-4 pt-4 pb-2">
        <div className="inline-flex items-center justify-center rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 shadow-sm backdrop-blur-md dark:border-emerald-800 dark:from-emerald-950/50 dark:to-teal-950/50 mb-2">
          <TrendingDown className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center justify-center gap-3">
          Mutui{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
            Market
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
          I migliori mutui del momento, aggiornati quotidianamente. Confronta
          tassi e spese dei principali istituti italiani.
        </p>
      </div>

      {/* Filtri principali */}
      <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
        <CardContent className="p-4 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tipo Tasso */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tipo Tasso
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/80">
                <button
                  onClick={() => setTipoTasso("F")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    tipoTasso === "F"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <Shield className="size-3.5 text-blue-500" />
                  Fisso
                </button>
                <button
                  onClick={() => setTipoTasso("V")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                    tipoTasso === "V"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <TrendingUp className="size-3.5 text-emerald-500" />
                  Variabile
                </button>
              </div>
            </div>

            {/* Durata */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Durata
              </label>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/80">
                {([15, 20, 30] as Durata[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDurata(d)}
                    className={`rounded-lg px-2 py-2.5 text-sm font-semibold transition-all ${
                      durata === d
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {d} anni
                  </button>
                ))}
              </div>
            </div>

            {/* Importo mutuo utente */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Importo Mutuo (€)
              </label>
              <Input
                type="number"
                value={importoUtente}
                onChange={(e) =>
                  setImportoUtente(parseInt(e.target.value) || 0)
                }
                className="h-11 rounded-xl text-base font-semibold tabular-nums"
                step={5000}
                min={0}
              />
            </div>

            {/* Ordina per */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ordina per
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100/80 p-1 dark:bg-slate-800/80">
                {(
                  [
                    { key: "taeg", label: "TAEG" },
                    { key: "tan", label: "TAN" },
                    { key: "rata", label: "Rata" },
                    { key: "spese", label: "Spese" },
                  ] as { key: SortField; label: string }[]
                ).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSortBy(item.key)}
                    className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all ${
                      sortBy === item.key
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats riassuntive + refresh */}
      {stats && !isLoading && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <TrendingDown className="size-3" />
              Miglior TAN: {stats.minTan.toFixed(2)}%
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
              <Award className="size-3" />
              Miglior TAEG: {stats.minTaeg.toFixed(2)}%
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {stats.totalOffers} offerte
            </span>
          </div>

          {lastUpdated && (
            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Clock className="size-3" />
              {lastUpdated}
            </span>
          )}
        </div>
      )}

      {/* Contenuto principale */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-card/70 py-20 shadow-sm backdrop-blur-sm gap-3">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-muted-foreground">
            Caricamento offerte mutui...
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-amber-200/70 bg-amber-50/50 py-16 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 gap-3">
          <AlertTriangle className="size-8 text-amber-500" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 rounded-xl"
            onClick={() => {
              setError(null);
              setIsLoading(true);
              fetchData();
            }}
          >
            Riprova
          </Button>
        </div>
      ) : sortedOffers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-card/70 py-16 shadow-sm backdrop-blur-sm gap-3">
          <Building2 className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Nessuna offerta disponibile per questa combinazione
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {sortedOffers.map((offer, idx) => (
            <OfferCard
              key={`${offer.istituto}-${offer.nomeMutuo}-${idx}`}
              offer={offer}
              rank={idx}
              importoUtente={importoUtente}
              durataUtente={durata}
            />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-slate-800/60 dark:bg-slate-900/30">
        <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          <strong>Nota:</strong> I dati vengono aggiornati automaticamente ogni
          giorno alle 21:00. Le rate mostrate sono ricalcolate in base
          all&apos;importo che inserisci, applicando il TAN di ciascuna offerta
          con ammortamento alla francese. I valori di TAEG, spese e condizioni
          possono variare in base al profilo del richiedente. Fonte:{" "}
          <span className="font-medium">MutuiSupermarket.it</span>
        </p>
      </div>
    </div>
  );
}
