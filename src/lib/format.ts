// === Funzioni di formattazione condivise ===

// Placeholder mostrato quando il valore non e' finito (NaN, Infinity, -Infinity).
// Coerente con la scelta gia' fatta in formatEuroCompact: mostrare un em-dash
// ("—") invece di propagare stringhe come "€NaN" o "Infinity%" nell'UI quando
// un calcolo a monte ha un input mancante o un edge case non previsto.
const NON_FINITE_PLACEHOLDER = '\u2014';

export const formatEuro = (value: number): string => {
    if (!Number.isFinite(value)) return NON_FINITE_PLACEHOLDER;
    return `\u20AC${value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
};

export const formatPercent = (value: number, decimals: number = 1): string => {
    if (!Number.isFinite(value)) return NON_FINITE_PLACEHOLDER;
    return `${value.toFixed(decimals)}%`;
};

// Formattazione compatta per KPI e dashboard dove lo spazio orizzontale e'
// limitato (es. header mobile). Sotto 10.000 usa il formato completo per
// preservare la precisione; sopra usa K/M con una sola cifra decimale eliminando
// lo zero finale superfluo (es. "€1.2M" invece di "€1.2M", "€125K", "€9.999").
export const formatEuroCompact = (value: number): string => {
    if (!Number.isFinite(value)) return NON_FINITE_PLACEHOLDER;
    const sign = value < 0 ? '-' : '';
    const abs = Math.abs(value);
    if (abs < 10_000) {
        return `${sign}\u20AC${abs.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
    }
    if (abs < 1_000_000) {
        const k = abs / 1_000;
        const str = k >= 100 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '');
        return `${sign}\u20AC${str}K`;
    }
    const m = abs / 1_000_000;
    const str = m >= 100 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '');
    return `${sign}\u20AC${str}M`;
};
