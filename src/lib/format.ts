// === Funzioni di formattazione condivise ===

export const formatEuro = (value: number): string =>
    `\u20AC${value.toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;

export const formatPercent = (value: number, decimals: number = 1): string =>
    `${value.toFixed(decimals)}%`;
