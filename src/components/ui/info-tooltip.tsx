"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
    children: React.ReactNode;
    /** Dimensione icona in Tailwind (default "w-3.5 h-3.5") */
    iconClassName?: string;
    /** Classe aggiuntiva sul contenuto tooltip */
    contentClassName?: string;
    /** Lato preferito (default "bottom") */
    side?: "top" | "bottom" | "left" | "right";
}

export function InfoTooltip({
    children,
    iconClassName,
    contentClassName,
    side = "bottom",
}: InfoTooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        aria-label="Informazioni"
                    >
                        <Info className={cn("w-3.5 h-3.5", iconClassName)} />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side={side}
                    className={cn("max-w-xs text-[11px] leading-relaxed", contentClassName)}
                >
                    {children}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
