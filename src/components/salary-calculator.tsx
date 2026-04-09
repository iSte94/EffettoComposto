"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatEuro } from "@/lib/format";
import {
  calculateNetSalary,
  type SalaryConfig,
  type SalaryResult,
} from "@/lib/finance/irpef";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Briefcase,
  Building2,
  Calculator,
  Cloud,
  Coins,
  HardDrive,
  History,
  PiggyBank,
  RotateCcw,
  Save,
  Scale,
  Trash2,
  Wallet2,
} from "lucide-react";

const DEFAULT_CONFIG: SalaryConfig = {
  ral: 30000,
  mensilita: 14,
  contractType: "standard",
  aliquotaAddizionaleRegionale: 0.015,
  aliquotaAddizionaleComunale: 0.008,
  applyBonus100: true,
  applyCuneoFiscale: true,
};

const CONTRACT_LABELS: Record<NonNullable<SalaryConfig["contractType"]>, string> = {
  standard: "Privato <15 dip.",
  over15: "Privato >15 dip.",
  pubblico: "Pubblico",
  apprendistato: "Apprendistato",
};

export interface SavedSalaryCalculation {
  id: string;
  createdAt: string;
  config: SalaryConfig;
  result: SalaryResult;
}

interface SalaryCalculatorProps {
  history: SavedSalaryCalculation[];
  onSaveCalculation: (entry: SavedSalaryCalculation) => void;
  onDeleteCalculation: (id: string) => void;
  persistenceMode: "account" | "device";
}

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildEntry(config: SalaryConfig, result: SalaryResult): SavedSalaryCalculation {
  const safeId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: safeId,
    createdAt: new Date().toISOString(),
    config: { ...config },
    result: { ...result },
  };
}

export function SalaryCalculator({
  history,
  onSaveCalculation,
  onDeleteCalculation,
  persistenceMode,
}: SalaryCalculatorProps) {
  const calculatorRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<SalaryConfig>(DEFAULT_CONFIG);

  const result = useMemo(() => calculateNetSalary(config), [config]);

  const totalTrattenute = result.inpsDipendente + result.irpefNetta + result.addizionali;
  const vantaggiFiscali =
    result.detrazioniLavoro + result.detrazioneCuneo + result.trattamentoIntegrativo;
  const retentionRate = config.ral > 0 ? (result.nettoAnnuale / config.ral) * 100 : 0;

  const storageCopy =
    persistenceMode === "account"
      ? "Le simulazioni restano salvate sul tuo account."
      : "Le simulazioni restano salvate su questo dispositivo.";

  const handleUpdate = <K extends keyof SalaryConfig>(field: K, value: SalaryConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!config.ral || config.ral <= 0) {
      toast.error("Inserisci una RAL valida prima di salvare la simulazione.");
      return;
    }

    onSaveCalculation(buildEntry(config, result));
    toast.success("Simulazione stipendio salvata nella cronologia.");
  };

  const handleDelete = (entry: SavedSalaryCalculation) => {
    const confirmed = window.confirm(
      `Vuoi davvero eliminare la simulazione da ${formatTimestamp(entry.createdAt)}?`,
    );

    if (!confirmed) return;

    onDeleteCalculation(entry.id);
    toast.success("Voce rimossa dalla cronologia.");
  };

  const handleReload = (entry: SavedSalaryCalculation) => {
    setConfig({ ...DEFAULT_CONFIG, ...entry.config });
    calculatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast.success("Simulazione ricaricata nel form.");
  };

  return (
    <div ref={calculatorRef} className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 shadow-sm backdrop-blur-xl">
          <CardHeader className="border-b border-border/70 bg-muted/40 pb-6 pt-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Calculator className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold text-foreground sm:text-2xl">
                  Lordo in Netto
                </CardTitle>
                <CardDescription className="max-w-xl text-sm leading-relaxed">
                  Simula la tua busta paga in modo dinamico e salva ogni scenario utile direttamente
                  nella cronologia della sezione Carriera.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Retribuzione Annua Lorda
                </Label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-muted-foreground">
                    EUR
                  </span>
                  <Input
                    type="number"
                    min="0"
                    value={config.ral}
                    onChange={(e) => handleUpdate("ral", Number(e.target.value))}
                    className="h-14 rounded-2xl border-border/70 bg-background/80 pl-14 text-lg font-extrabold tabular-nums focus-visible:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Mensilita
                </Label>
                <Select
                  value={String(config.mensilita ?? DEFAULT_CONFIG.mensilita)}
                  onValueChange={(value) => handleUpdate("mensilita", Number(value))}
                >
                  <SelectTrigger className="mt-2 h-12 rounded-2xl bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 mensilita</SelectItem>
                    <SelectItem value="13">13 mensilita</SelectItem>
                    <SelectItem value="14">14 mensilita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Contratto
                </Label>
                <Select
                  value={config.contractType ?? DEFAULT_CONFIG.contractType}
                  onValueChange={(value) =>
                    handleUpdate("contractType", value as SalaryConfig["contractType"])
                  }
                >
                  <SelectTrigger className="mt-2 h-12 rounded-2xl bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Privato &lt;15 dip.</SelectItem>
                    <SelectItem value="over15">Privato &gt;15 dip.</SelectItem>
                    <SelectItem value="pubblico">Pubblico</SelectItem>
                    <SelectItem value="apprendistato">Apprendistato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-border/70 bg-muted/40 p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  <Building2 className="h-4 w-4 text-sky-500" />
                  Addizionali locali
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Regionale (%)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(config.aliquotaAddizionaleRegionale ?? 0) * 100}
                      onChange={(e) =>
                        handleUpdate(
                          "aliquotaAddizionaleRegionale",
                          Number(e.target.value) / 100,
                        )
                      }
                      className="mt-2 h-11 rounded-2xl bg-background/90 tabular-nums"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground">
                      Comunale (%)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(config.aliquotaAddizionaleComunale ?? 0) * 100}
                      onChange={(e) =>
                        handleUpdate(
                          "aliquotaAddizionaleComunale",
                          Number(e.target.value) / 100,
                        )
                      }
                      className="mt-2 h-11 rounded-2xl bg-background/90 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/70 bg-muted/40 p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  <Coins className="h-4 w-4 text-emerald-500" />
                  Ottimizzazioni
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Taglio cuneo fiscale</p>
                      <p className="text-xs text-muted-foreground">
                        Include quota previdenziale e detrazione 2026.
                      </p>
                    </div>
                    <Switch
                      checked={config.applyCuneoFiscale}
                      onCheckedChange={(checked) => handleUpdate("applyCuneoFiscale", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Trattamento integrativo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bonus da 100 euro per i redditi compatibili.
                      </p>
                    </div>
                    <Switch
                      checked={config.applyBonus100}
                      onCheckedChange={(checked) => handleUpdate("applyBonus100", checked)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-background to-teal-50 shadow-lg shadow-emerald-500/5 dark:border-emerald-900/50 dark:from-emerald-950/25 dark:via-background dark:to-teal-950/10">
            <CardContent className="space-y-6 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
                    Anteprima live
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Il risultato si aggiorna mentre modifichi i parametri. Salva solo gli scenari
                    che vuoi ricordare.
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Wallet2 className="h-6 w-6" />
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-background/90 p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Netto mensile
                </p>
                <motion.div
                  key={result.nettoMensile}
                  initial={{ opacity: 0.5, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl"
                >
                  {formatEuro(result.nettoMensile)}
                </motion.div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Netto annuo stimato:{" "}
                  <span className="font-bold text-foreground">{formatEuro(result.nettoAnnuale)}</span>
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    Imponibile IRPEF
                  </p>
                  <p className="mt-2 text-xl font-extrabold tabular-nums text-foreground">
                    {formatEuro(result.imponibileIrpef)}
                  </p>
                </div>

                <div className="rounded-3xl border border-rose-200/70 bg-rose-50/80 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-rose-600 dark:text-rose-400">
                    Trattenute
                  </p>
                  <p className="mt-2 text-xl font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
                    {formatEuro(totalTrattenute)}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
                    Bonus e detrazioni
                  </p>
                  <p className="mt-2 text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatEuro(vantaggiFiscali)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-background/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="rounded-2xl bg-muted p-2 text-foreground">
                    {persistenceMode === "account" ? (
                      <Cloud className="h-4 w-4" />
                    ) : (
                      <HardDrive className="h-4 w-4" />
                    )}
                  </div>
                  <p>{storageCopy}</p>
                </div>

                <Button
                  type="button"
                  onClick={handleSave}
                  className="h-11 rounded-2xl bg-emerald-600 px-5 font-bold text-white hover:bg-emerald-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Calcola e salva
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 shadow-sm backdrop-blur-xl">
            <CardHeader className="border-b border-border/70 bg-muted/30 pb-5 pt-5">
              <CardTitle className="text-lg font-bold">Estratto deduzioni</CardTitle>
              <CardDescription>
                Vista rapida delle trattenute e dei vantaggi fiscali che portano dal lordo al netto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-sky-500" />
                  <span className="text-sm font-medium text-foreground">Contributi INPS</span>
                </div>
                <span className="font-bold tabular-nums text-rose-600">
                  - {formatEuro(result.inpsDipendente)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Scale className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-medium text-foreground">IRPEF netta</span>
                </div>
                <span className="font-bold tabular-nums text-rose-600">
                  - {formatEuro(result.irpefNetta)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Addizionali</span>
                </div>
                <span className="font-bold tabular-nums text-rose-600">
                  - {formatEuro(result.addizionali)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Coins className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium text-foreground">
                    Detrazioni lavoro dipendente
                  </span>
                </div>
                <span className="font-bold tabular-nums text-emerald-600">
                  + {formatEuro(result.detrazioniLavoro)}
                </span>
              </div>

              {result.detrazioneCuneo > 0 && (
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-foreground">Detrazione cuneo</span>
                  </div>
                  <span className="font-bold tabular-nums text-emerald-600">
                    + {formatEuro(result.detrazioneCuneo)}
                  </span>
                </div>
              )}

              {result.trattamentoIntegrativo > 0 && (
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <PiggyBank className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-foreground">
                      Trattamento integrativo
                    </span>
                  </div>
                  <span className="font-bold tabular-nums text-emerald-600">
                    + {formatEuro(result.trattamentoIntegrativo)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 shadow-sm backdrop-blur-xl">
        <CardHeader className="border-b border-border/70 bg-muted/30 pb-5 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <History className="h-5 w-5 text-emerald-500" />
                Cronologia simulazioni
              </CardTitle>
              <CardDescription className="mt-1">
                Ogni click su &quot;Calcola e salva&quot; aggiunge un nuovo scenario sotto al
                widget.
              </CardDescription>
            </div>
            <div className="rounded-full bg-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {history.length} salvate
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {history.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-border/80 bg-muted/30 px-6 py-10 text-center">
              <p className="text-base font-semibold text-foreground">
                Nessuna simulazione in archivio
              </p>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Salva i calcoli che vuoi confrontare: RAL, netto mensile, trattenute e bonus
                resteranno disponibili qui sotto.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.18) }}
                  className="rounded-[1.75rem] border border-border/70 bg-background/80 p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {CONTRACT_LABELS[entry.config.contractType ?? "standard"]}
                        </span>
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                          {entry.config.mensilita ?? 14} mens.
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatTimestamp(entry.createdAt)}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                            RAL
                          </p>
                          <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">
                            {formatEuro(entry.config.ral)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                            Netto mensile
                          </p>
                          <p className="mt-1 text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatEuro(entry.result.nettoMensile)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                            Netto annuo
                          </p>
                          <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">
                            {formatEuro(entry.result.nettoAnnuale)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleReload(entry)}
                        className="h-11 rounded-2xl border-emerald-200 bg-emerald-50 px-4 font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Ricarica
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDelete(entry)}
                        className="h-11 rounded-2xl border-rose-200 bg-rose-50 px-4 font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-muted/50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        INPS
                      </p>
                      <p className="mt-2 font-bold tabular-nums text-foreground">
                        {formatEuro(entry.result.inpsDipendente)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        IRPEF netta
                      </p>
                      <p className="mt-2 font-bold tabular-nums text-foreground">
                        {formatEuro(entry.result.irpefNetta)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        Addizionali
                      </p>
                      <p className="mt-2 font-bold tabular-nums text-foreground">
                        {formatEuro(entry.result.addizionali)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/50 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        Vantaggi fiscali
                      </p>
                      <p className="mt-2 font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatEuro(
                          entry.result.detrazioniLavoro +
                            entry.result.detrazioneCuneo +
                            entry.result.trattamentoIntegrativo,
                        )}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Lordo mensile
            </p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-foreground">
              {formatEuro(result.lordoMensile)}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Ritenzione netta
            </p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-foreground">
              {retentionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-sm">
          <CardContent className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Salvataggio
            </p>
            <p className="mt-2 flex items-center gap-2 text-base font-bold text-foreground">
              {persistenceMode === "account" ? (
                <Cloud className="h-4 w-4 text-emerald-500" />
              ) : (
                <HardDrive className="h-4 w-4 text-emerald-500" />
              )}
              {persistenceMode === "account" ? "Account" : "Dispositivo"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
