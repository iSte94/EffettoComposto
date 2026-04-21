"use client";

export const FINANCIAL_DATA_CHANGED_EVENT = "effetto-composto:financial-data-changed";

export type FinancialDataChangeScope = "preferences" | "patrimonio" | "planned-events" | "all";

export interface FinancialDataChangedDetail {
    scope: FinancialDataChangeScope;
    source?: string;
}

export function broadcastFinancialDataChanged(detail: FinancialDataChangedDetail): void {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
        new CustomEvent<FinancialDataChangedDetail>(FINANCIAL_DATA_CHANGED_EVENT, {
            detail,
        }),
    );
}

export function addFinancialDataChangedListener(
    listener: (detail: FinancialDataChangedDetail) => void,
): () => void {
    if (typeof window === "undefined") return () => undefined;

    const handler = (event: Event) => {
        const customEvent = event as CustomEvent<FinancialDataChangedDetail>;
        listener(customEvent.detail ?? { scope: "all" });
    };

    window.addEventListener(FINANCIAL_DATA_CHANGED_EVENT, handler as EventListener);

    return () => {
        window.removeEventListener(FINANCIAL_DATA_CHANGED_EVENT, handler as EventListener);
    };
}
