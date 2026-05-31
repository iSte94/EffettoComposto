import type { CSSProperties } from "react";

import { formatEuroCompact } from "@/lib/format";

export const CHART_COLORS = {
    wealth: "#10b981",
    wealthSoft: "#6ee7b7",
    income: "#059669",
    expense: "#f43f5e",
    debt: "#e11d48",
    interest: "#f97316",
    target: "#f59e0b",
    capital: "#2563eb",
    contribution: "#3b82f6",
    investment: "#4f46e5",
    liquidity: "#06b6d4",
    realEstate: "#0ea5e9",
    bitcoin: "#f59e0b",
    opportunity: "#8b5cf6",
    neutral: "#64748b",
    muted: "#94a3b8",
    positive: "#10b981",
    negative: "#f43f5e",
    scenarioA: "#2563eb",
    scenarioB: "#10b981",
    scenarioC: "#f59e0b",
} as const;

export const CHART_GRID_PROPS = {
    stroke: "var(--border)",
    strokeDasharray: "4 8",
    strokeOpacity: 0.7,
    vertical: false,
} as const;

export const CHART_AXIS_TICK = {
    fill: "var(--muted-foreground)",
    fontSize: 11,
    fontWeight: 600,
} as const;

export const CHART_AXIS_PROPS = {
    axisLine: false,
    tickLine: false,
    tick: CHART_AXIS_TICK,
} as const;

export const CHART_TOOLTIP_STYLE: CSSProperties = {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "1rem",
    boxShadow: "0 22px 50px -22px rgba(15, 23, 42, 0.55)",
    color: "var(--popover-foreground)",
    padding: "12px 14px",
};

export const DARK_CHART_TOOLTIP_STYLE: CSSProperties = {
    backgroundColor: "rgba(2, 6, 23, 0.96)",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    borderRadius: "1rem",
    boxShadow: "0 22px 50px -22px rgba(0, 0, 0, 0.65)",
    color: "#e2e8f0",
    padding: "12px 14px",
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
    color: "var(--foreground)",
    fontSize: "12px",
    fontWeight: 800,
    marginBottom: "8px",
};

export const DARK_CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
    color: "#f8fafc",
    fontSize: "12px",
    fontWeight: 800,
    marginBottom: "8px",
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
    color: "var(--muted-foreground)",
    fontSize: "12px",
    fontWeight: 700,
};

export const DARK_CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
};

export const CHART_LEGEND_STYLE: CSSProperties = {
    color: "var(--muted-foreground)",
    fontSize: "12px",
    fontWeight: 700,
    paddingTop: "6px",
};

export const DARK_CHART_LEGEND_STYLE: CSSProperties = {
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: 700,
    paddingTop: "6px",
};

export const CHART_CURSOR = {
    fill: "var(--muted)",
    fillOpacity: 0.35,
    stroke: "var(--border)",
    strokeDasharray: "4 4",
} as const;

export const CHART_BAR_RADIUS = [8, 8, 2, 2] as [number, number, number, number];
export const CHART_HORIZONTAL_BAR_RADIUS = [2, 10, 10, 2] as [number, number, number, number];

export function formatCompactEuroAxis(value: number | string): string {
    return formatEuroCompact(Number(value));
}

export function formatCompactNumberAxis(value: number | string): string {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    const abs = Math.abs(numeric);
    if (abs >= 1_000_000) return `${(numeric / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000) return `${Math.round(numeric / 1_000)}k`;
    return String(Math.round(numeric));
}

