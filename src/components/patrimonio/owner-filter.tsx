"use client";

import { memo } from "react";
import { Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetOwner } from "@/types";

export type OwnerFilter = "all" | "person1" | "person2";

interface OwnerFilterBarProps {
    value: OwnerFilter;
    onChange: (filter: OwnerFilter) => void;
    person1Name: string;
    person2Name: string;
    person1Total?: number;
    person2Total?: number;
    formatValue?: (v: number) => string;
    colorScheme?: "default" | "rose";
}

const filterBtnBase = "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 sm:flex-none";

export const OwnerFilterBar = memo(function OwnerFilterBar({
    value, onChange, person1Name, person2Name,
    person1Total, person2Total, formatValue,
    colorScheme = "default",
}: OwnerFilterBarProps) {
    const isRose = colorScheme === "rose";

    const activeBg = isRose
        ? "bg-rose-100 text-rose-700 shadow-sm dark:bg-rose-950/60 dark:text-rose-300"
        : "bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-950/60 dark:text-blue-300";
    const inactiveBg = "bg-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800";

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1">
                <button
                    type="button"
                    className={cn(filterBtnBase, value === "all" ? activeBg : inactiveBg)}
                    onClick={() => onChange("all")}
                >
                    <Users className="h-3.5 w-3.5" /> Tutti
                </button>
                <button
                    type="button"
                    className={cn(
                        filterBtnBase,
                        value === "person1"
                            ? "bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-950/60 dark:text-blue-300"
                            : inactiveBg
                    )}
                    onClick={() => onChange("person1")}
                >
                    <User className="h-3.5 w-3.5" /> {person1Name}
                </button>
                <button
                    type="button"
                    className={cn(
                        filterBtnBase,
                        value === "person2"
                            ? "bg-violet-100 text-violet-700 shadow-sm dark:bg-violet-950/60 dark:text-violet-300"
                            : inactiveBg
                    )}
                    onClick={() => onChange("person2")}
                >
                    <User className="h-3.5 w-3.5" /> {person2Name}
                </button>
            </div>

            {formatValue && person1Total !== undefined && person2Total !== undefined && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">
                        {person1Name}: {formatValue(person1Total)}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-violet-700">
                        {person2Name}: {formatValue(person2Total)}
                    </span>
                </div>
            )}
        </div>
    );
});

interface OwnerBadgeSelectProps {
    value?: AssetOwner;
    onChange: (owner: AssetOwner) => void;
    person1Name: string;
    person2Name: string;
}

const badgeColors: Record<AssetOwner, string> = {
    person1: "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/60",
    person2: "border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-400 dark:hover:bg-violet-950/60",
};

export const OwnerBadgeSelect = memo(function OwnerBadgeSelect({
    value, onChange, person1Name, person2Name,
}: OwnerBadgeSelectProps) {
    const current = value || "person1";
    const label = current === "person1" ? person1Name : person2Name;

    const toggle = () => {
        onChange(current === "person1" ? "person2" : "person1");
    };

    return (
        <button
            type="button"
            onClick={toggle}
            title={`Proprietario: ${label}. Clicca per cambiare.`}
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                badgeColors[current]
            )}
        >
            <User className="h-2.5 w-2.5" />
            {label}
        </button>
    );
});
