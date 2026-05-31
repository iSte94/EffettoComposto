"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { formatEuro } from "@/lib/format";
import {
    CHART_AXIS_PROPS,
    CHART_BAR_RADIUS,
    CHART_COLORS,
    CHART_CURSOR,
    CHART_GRID_PROPS,
    CHART_TOOLTIP_ITEM_STYLE,
    CHART_TOOLTIP_LABEL_STYLE,
    CHART_TOOLTIP_STYLE,
    formatCompactEuroAxis,
} from "@/components/ui/chart-style";

export interface ComparisonRow {
    name: string;
    Budget: number;
    Speso: number;
    overBudget: boolean;
}

interface BudgetComparisonChartProps {
    data: ComparisonRow[];
    periodLabel: string;
}

function BudgetComparisonChartComponent({ data, periodLabel }: BudgetComparisonChartProps) {
    if (data.length === 0) return null;
    return (
        <Card className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-xl">
            <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-muted-foreground">Budget vs Speso</h3>
                    <span className="text-[10px] text-muted-foreground">{periodLabel}</span>
                </div>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                        <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 6 }} barCategoryGap="24%">
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="name" {...CHART_AXIS_PROPS} interval={0} minTickGap={10} />
                            <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatCompactEuroAxis} width={58} />
                            <Tooltip
                                formatter={(value: number | string | undefined) => formatEuro(Number(value ?? 0))}
                                contentStyle={CHART_TOOLTIP_STYLE}
                                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                                cursor={CHART_CURSOR}
                            />
                            <Bar dataKey="Budget" fill={CHART_COLORS.capital} fillOpacity={0.38} radius={CHART_BAR_RADIUS} />
                            <Bar dataKey="Speso" radius={CHART_BAR_RADIUS}>
                                {data.map((entry, index) => (
                                    <Cell key={index} fill={entry.overBudget ? CHART_COLORS.expense : CHART_COLORS.income} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export const BudgetComparisonChart = memo(BudgetComparisonChartComponent);
