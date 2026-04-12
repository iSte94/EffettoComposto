"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { formatEuro } from "@/lib/format";

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
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                            <Tooltip
                                formatter={(value: number | string | undefined) => formatEuro(Number(value ?? 0))}
                                contentStyle={{
                                    borderRadius: "16px",
                                    border: "1px solid var(--border)",
                                    backgroundColor: "var(--popover)",
                                    color: "var(--popover-foreground)",
                                    boxShadow: "0 16px 40px -16px rgba(15, 23, 42, 0.45)",
                                }}
                            />
                            <Bar dataKey="Budget" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Speso" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={index} fill={entry.overBudget ? "#ef4444" : "#10b981"} />
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
