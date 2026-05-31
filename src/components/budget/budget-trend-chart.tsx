"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { formatEuro } from "@/lib/format";
import {
    CHART_AXIS_PROPS,
    CHART_BAR_RADIUS,
    CHART_COLORS,
    CHART_CURSOR,
    CHART_GRID_PROPS,
    CHART_LEGEND_STYLE,
    CHART_TOOLTIP_ITEM_STYLE,
    CHART_TOOLTIP_LABEL_STYLE,
    CHART_TOOLTIP_STYLE,
    formatCompactEuroAxis,
} from "@/components/ui/chart-style";

export interface TrendRow {
    month: string;          // YYYY-MM
    label: string;          // "gen 2026"
    Entrate: number;
    Spese: number;
    Risparmio: number;
}

interface BudgetTrendChartProps {
    data: TrendRow[];
    budgetTotal: number;
}

function BudgetTrendChartComponent({ data, budgetTotal }: BudgetTrendChartProps) {
    if (data.length < 2) return null;
    return (
        <Card className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl">
            <CardContent className="p-5">
                <h3 className="mb-4 text-sm font-bold text-muted-foreground">Andamento Mensile</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 6 }}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="label" {...CHART_AXIS_PROPS} minTickGap={18} />
                            <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatCompactEuroAxis} width={58} />
                            <Tooltip
                                formatter={(value: number | string | undefined) => formatEuro(Number(value ?? 0))}
                                contentStyle={CHART_TOOLTIP_STYLE}
                                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                                cursor={CHART_CURSOR}
                            />
                            <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="circle" />
                            <Bar dataKey="Entrate" fill={CHART_COLORS.income} radius={CHART_BAR_RADIUS} />
                            <Bar dataKey="Spese" fill={CHART_COLORS.expense} radius={CHART_BAR_RADIUS} />
                            <Line type="monotone" dataKey="Risparmio" stroke={CHART_COLORS.investment} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            {budgetTotal > 0 && (
                                <ReferenceLine y={budgetTotal} stroke={CHART_COLORS.target} strokeDasharray="5 5" label={{ value: `Budget ${formatEuro(budgetTotal)}`, fill: CHART_COLORS.target, fontSize: 11, fontWeight: 700, position: "insideTopRight" }} />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export const BudgetTrendChart = memo(BudgetTrendChartComponent);
