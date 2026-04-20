import { memo } from "react";
import { TrendingUp, TrendingDown, Minus, Flame, PiggyBank, Rocket } from "lucide-react";
import { formatEuro, formatEuroCompact } from "@/lib/format";
import type { HeaderKpis } from "@/hooks/useHeaderKpis";

interface HeaderKpisBarProps {
    kpis: HeaderKpis;
    onNavigate: (tab: string) => void;
}

export const HeaderKpisBar = memo(function HeaderKpisBar({ kpis, onNavigate }: HeaderKpisBarProps) {
    // Soglia di 0,5€ per evitare che rumore di arrotondamento su centesimi
    // finisca per colorare il delta come variazione reale.
    const changeDirection: "up" | "down" | "flat" =
        kpis.netWorthChange > 0.5 ? "up" : kpis.netWorthChange < -0.5 ? "down" : "flat";
    const changeIcon = changeDirection === "up"
        ? <TrendingUp className="size-3.5 text-emerald-500" />
        : changeDirection === "down"
            ? <TrendingDown className="size-3.5 text-rose-500" />
            : <Minus className="size-3.5 text-muted-foreground" />;
    const changeColor = changeDirection === "up"
        ? "text-emerald-600"
        : changeDirection === "down"
            ? "text-rose-600"
            : "text-muted-foreground";
    const changeLabel = changeDirection === "flat"
        ? "\u20AC0"
        : `${changeDirection === "up" ? "+" : ""}${formatEuroCompact(kpis.netWorthChange)}`;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Patrimonio netto */}
            <button
                onClick={() => onNavigate("overview")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3 min-h-10 text-sm font-semibold transition-colors hover:bg-accent cursor-pointer"
                title={`Patrimonio netto ${formatEuro(kpis.netWorth)} — variazione ${formatEuro(kpis.netWorthChange)}`}
            >
                {changeIcon}
                <span className="tabular-nums">{formatEuro(kpis.netWorth)}</span>
                <span className={`text-xs tabular-nums ${changeColor}`}>
                    {changeLabel}
                </span>
            </button>

            {/* FIRE progress */}
            {kpis.fireTarget > 0 && (
                <button
                    onClick={() => onNavigate("fire")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3 min-h-10 text-sm font-semibold transition-colors hover:bg-accent cursor-pointer"
                    title={`Target FIRE: ${formatEuro(kpis.fireTarget)}`}
                >
                    <Flame className="size-3.5 text-orange-500" />
                    <div className="flex items-center gap-1.5">
                        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, kpis.fireProgress)}%` }}
                            />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                            {kpis.fireProgress.toFixed(0)}%
                        </span>
                    </div>
                </button>
            )}

            {/* Savings rate */}
            {kpis.savingsRate !== null && (
                <button
                    onClick={() => {
                        onNavigate("patrimonio");
                        // Poll for the element since the tab is lazy-loaded
                        let attempts = 0;
                        const poll = setInterval(() => {
                            const el = document.getElementById("cashflow-section");
                            if (el) {
                                clearInterval(poll);
                                el.scrollIntoView({ behavior: "smooth", block: "center" });
                            } else if (++attempts > 20) {
                                clearInterval(poll);
                            }
                        }, 150);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3 min-h-10 text-sm font-semibold transition-colors hover:bg-accent cursor-pointer"
                    title="Cashflow familiare — tasso di risparmio"
                >
                    <PiggyBank className="size-3.5 text-violet-500" />
                    <span className={`text-xs tabular-nums ${kpis.savingsRate > 50 ? "text-emerald-400 font-bold" : kpis.savingsRate >= 36 ? "text-emerald-600" : kpis.savingsRate >= 20 ? "text-amber-600" : "text-rose-600"}`}>
                        {kpis.savingsRate}%
                    </span>
                    {kpis.savingsRate > 50 && <Rocket className="size-3 text-emerald-400" />}
                </button>
            )}
        </div>
    );
});
