"use client";

import { memo, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, TrendingUp, TrendingDown, Info, AlertCircle } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { computeSaleTax, IT_CAPITAL_GAIN_TAX, IT_GOVT_BOND_TAX } from "@/lib/finance/sale-tax";

interface SaleTaxModalProps {
    ticker?: string;
    defaultShares?: number;
    defaultCurrentPrice?: number;
    defaultAverageCost?: number;
    trigger?: React.ReactNode;
}

type AssetKind = "equity" | "bond";

export const SaleTaxModal = memo(function SaleTaxModal({
    ticker,
    defaultShares = 0,
    defaultCurrentPrice = 0,
    defaultAverageCost = 0,
    trigger,
}: SaleTaxModalProps) {
    const [open, setOpen] = useState(false);
    const [shares, setShares] = useState<string>(String(defaultShares || ""));
    const [currentPrice, setCurrentPrice] = useState<string>(String(defaultCurrentPrice || ""));
    const [averageCost, setAverageCost] = useState<string>(String(defaultAverageCost || ""));
    const [assetKind, setAssetKind] = useState<AssetKind>("equity");
    const [accumulatedLosses, setAccumulatedLosses] = useState<string>("");

    const result = useMemo(() => {
        const s = parseFloat(shares) || 0;
        const p = parseFloat(currentPrice) || 0;
        const c = parseFloat(averageCost) || 0;
        const l = parseFloat(accumulatedLosses) || 0;
        if (s <= 0 || p <= 0) return null;
        return computeSaleTax({
            shares: s,
            currentPrice: p,
            averageCost: c,
            accumulatedLosses: l,
            taxRatePct: assetKind === "bond" ? IT_GOVT_BOND_TAX * 100 : IT_CAPITAL_GAIN_TAX * 100,
        });
    }, [shares, currentPrice, averageCost, assetKind, accumulatedLosses]);

    const resetFields = () => {
        setShares(String(defaultShares || ""));
        setCurrentPrice(String(defaultCurrentPrice || ""));
        setAverageCost(String(defaultAverageCost || ""));
        setAccumulatedLosses("");
    };

    return (
        <Dialog open={open} onOpenChange={(o) => {
            setOpen(o);
            if (o) resetFields();
        }}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button variant="outline" size="sm" className="rounded-full">
                        <Receipt className="w-3.5 h-3.5 mr-1.5" /> Simula Vendita
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-border/70 rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Receipt className="w-5 h-5 text-violet-500" />
                        Simulazione Fiscale Vendita
                        {ticker && <span className="text-muted-foreground font-normal">— {ticker}</span>}
                    </DialogTitle>
                    <DialogDescription>
                        Calcola la plusvalenza, la tassa 26% (12,5% titoli di stato) e il netto incassato dalla vendita.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 pt-2">
                    {/* Asset kind toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setAssetKind("equity")}
                            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                                assetKind === "equity"
                                    ? "bg-violet-500 text-white border-violet-500 shadow-md"
                                    : "bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted"
                            }`}
                        >
                            Azioni / ETF / Cripto (26%)
                        </button>
                        <button
                            type="button"
                            onClick={() => setAssetKind("bond")}
                            className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                                assetKind === "bond"
                                    ? "bg-amber-500 text-white border-amber-500 shadow-md"
                                    : "bg-muted/40 text-muted-foreground border-border/70 hover:bg-muted"
                            }`}
                        >
                            Titoli di Stato (12,5%)
                        </button>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <Label htmlFor="shares" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Quantità
                            </Label>
                            <Input
                                id="shares"
                                type="number"
                                step="0.0001"
                                min="0"
                                value={shares}
                                onChange={(e) => setShares(e.target.value)}
                                className="mt-1.5 tabular-nums"
                            />
                        </div>
                        <div>
                            <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Prezzo Attuale (€)
                            </Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.0001"
                                min="0"
                                value={currentPrice}
                                onChange={(e) => setCurrentPrice(e.target.value)}
                                className="mt-1.5 tabular-nums"
                            />
                        </div>
                        <div>
                            <Label htmlFor="cost" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Costo Medio (€)
                            </Label>
                            <Input
                                id="cost"
                                type="number"
                                step="0.0001"
                                min="0"
                                value={averageCost}
                                onChange={(e) => setAverageCost(e.target.value)}
                                className="mt-1.5 tabular-nums"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="losses" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            Minusvalenze da Compensare (€)
                            <span className="text-[10px] text-muted-foreground/70 font-normal normal-case italic">(opzionale, validità 4 anni)</span>
                        </Label>
                        <Input
                            id="losses"
                            type="number"
                            step="1"
                            min="0"
                            value={accumulatedLosses}
                            onChange={(e) => setAccumulatedLosses(e.target.value)}
                            className="mt-1.5 tabular-nums"
                            placeholder="0"
                        />
                    </div>

                    {/* Result */}
                    {result ? (
                        <div className={`rounded-2xl border-2 p-5 ${
                            result.isGain
                                ? "border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                                : "border-rose-200/70 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20"
                        }`}>
                            <div className="flex items-center gap-2 mb-4">
                                {result.isGain ? (
                                    <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                )}
                                <span className={`text-sm font-extrabold uppercase tracking-wider ${
                                    result.isGain ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                                }`}>
                                    {result.isGain ? "Plusvalenza" : "Minusvalenza"}
                                </span>
                                <span className={`ml-auto text-2xl font-extrabold tabular-nums ${
                                    result.isGain ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
                                }`}>
                                    {result.isGain ? "+" : "−"}{formatEuro(Math.abs(result.capitalGain))}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ricavo lordo</div>
                                    <div className="text-base font-extrabold tabular-nums">{formatEuro(result.grossProceeds)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Costo base</div>
                                    <div className="text-base font-extrabold tabular-nums">{formatEuro(result.costBasis)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Tassa ({result.taxRatePct.toFixed(1)}%)
                                    </div>
                                    <div className="text-base font-extrabold tabular-nums text-rose-600 dark:text-rose-400">
                                        −{formatEuro(result.taxAmount)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Netto incassato</div>
                                    <div className={`text-base font-extrabold tabular-nums ${
                                        result.isGain ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"
                                    }`}>
                                        {formatEuro(result.netProceeds)}
                                    </div>
                                </div>
                            </div>

                            {result.compensatedLoss > 0 && (
                                <div className="rounded-xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200/70 dark:border-violet-900/50 p-3 flex items-start gap-2 mb-2">
                                    <Info className="w-4 h-4 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                                    <div className="text-xs leading-relaxed">
                                        <strong className="text-violet-700 dark:text-violet-300">Compensazione applicata:</strong> {formatEuro(result.compensatedLoss)} di minusvalenze hanno ridotto la base imponibile a {formatEuro(result.taxableGain)}.
                                        {result.remainingLoss > 0 && (
                                            <span> Residuo da riportare: <strong className="tabular-nums">{formatEuro(result.remainingLoss)}</strong>.</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!result.isGain && (
                                <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 p-3 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                    <div className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                        <strong>Minusvalenza di {formatEuro(Math.abs(result.capitalGain))}.</strong> Nessuna tassa dovuta. Puoi compensarla contro plusvalenze future entro 4 anni (solo su strumenti di pari natura: &quot;redditi diversi&quot;).
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border-2 border-dashed border-border/70 bg-muted/30 p-6 text-center">
                            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm text-muted-foreground">Inserisci quantità e prezzo per calcolare l&apos;impatto fiscale.</p>
                        </div>
                    )}

                    <div className="text-[10px] text-muted-foreground italic border-t border-border/70 pt-3">
                        ⓘ Calcolo semplificato. Non include bollo titoli (0,2% annuo sullo stock), commissioni di vendita o regime amministrato/gestito. Consulta il tuo commercialista per scenari complessi.
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});
