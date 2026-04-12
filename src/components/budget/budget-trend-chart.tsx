"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";
import { formatEuro } from "@/lib/format";

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
                        <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
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
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="Entrate" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Spese" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="Risparmio" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                            {budgetTotal > 0 && (
                                <ReferenceLine y={budgetTotal} stroke="#a855f7" strokeDasharray="4 4" label={{ value: `Budget ${formatEuro(budgetTotal)}`, fill: "#a855f7", fontSize: 10, position: "insideTopRight" }} />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

export const BudgetTrendChart = memo(BudgetTrendChartComponent);
