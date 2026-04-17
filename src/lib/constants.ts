// === Costanti condivise dell'applicazione ===

// Tassi di cambio (TODO: sostituire con API real-time in futuro)
export const USD_TO_EUR = 0.92;
export const GBP_TO_EUR = 1.20; // Da GBp (pence) dividere per 100 prima

// Soglie finanziarie
export const DTI_THRESHOLD = 0.33; // Rapporto rata/reddito massimo sostenibile (33%)

// Rivalutazione immobiliare default
export const DEFAULT_PROPERTY_APPRECIATION = 0.02; // 2% annuo

// IRPEF 2026 brackets (allineati con irpef.ts: 23%, 33%, 43%)
export const IRPEF_BRACKETS = [
    { limit: 28000, rate: 0.23 },
    { limit: 50000, rate: 0.33 },
    { limit: Infinity, rate: 0.43 },
] as const;
