import { memo } from "react";
import { TrendingUp, TrendingDown, Flame, PiggyBank, Rocket } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { HeaderKpis } from "@/hooks/useHeaderKpis";

interface HeaderKpisBarProps {
    kpis: HeaderKpis;
    onNavigate: (tab: string) => void;
}

export const HeaderKpisBar = memo(function HeaderKpisBar({ kpis, onNavigate }: HeaderKpisBarProps) {
    const isPositive = kpis.netWorthChange >= 0;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Patrimonio netto */}
            <button
                onClick={() => onNavigate("overview")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/80 px-3 min-h-10 text-sm font-semibold transition-colors hover:bg-accent cursor-pointer"
                title="Vai al Riepilogo"
            >
                {isPositive
                    ? <TrendingUp className="size-3.5 text-emerald-500" />
                    : <TrendingDown className="size-3.5 text-rose-500" />
                }
                <span className="tabular-nums">{formatEuro(kpis.netWorth)}</span>
                <span className={`text-xs tabular-nums ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                    {isPositive ? "+" : ""}{formatEuro(kpis.netWorthChange)}
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
                        setTimeout(() => {
                            const el = document.getElementById("cashflow-section");
                            if (el) {
                                el.scrollIntoView({ behavior: "smooth", block: "center" });
                            } else {
                                // lazy-loaded tab may need more time
                                setTimeout(() => {
                                    document.getElementById("cashflow-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }, 500);
                            }
                        }, 200);
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
