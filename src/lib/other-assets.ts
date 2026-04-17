export interface OtherAssetsOwnership {
    safeHavensP1: number;
    safeHavensP2: number;
    pensionFundP1: number;
    pensionFundP2: number;
    bitcoinAmountP1: number;
    bitcoinAmountP2: number;
}

export const DEFAULT_OTHER_ASSETS_OWNERSHIP: OtherAssetsOwnership = {
    safeHavensP1: 0,
    safeHavensP2: 0,
    pensionFundP1: 0,
    pensionFundP2: 0,
    bitcoinAmountP1: 0,
    bitcoinAmountP2: 0,
};

function toNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function parseOtherAssetsOwnership(raw: unknown): OtherAssetsOwnership {
    if (typeof raw !== "string" || raw.trim() === "") {
        return { ...DEFAULT_OTHER_ASSETS_OWNERSHIP };
    }

    try {
        const parsed = JSON.parse(raw) as Partial<OtherAssetsOwnership>;
        return {
            safeHavensP1: toNumber(parsed.safeHavensP1),
            safeHavensP2: toNumber(parsed.safeHavensP2),
            pensionFundP1: toNumber(parsed.pensionFundP1),
            pensionFundP2: toNumber(parsed.pensionFundP2),
            bitcoinAmountP1: toNumber(parsed.bitcoinAmountP1),
            bitcoinAmountP2: toNumber(parsed.bitcoinAmountP2),
        };
    } catch {
        return { ...DEFAULT_OTHER_ASSETS_OWNERSHIP };
    }
}

export function stringifyOtherAssetsOwnership(value: OtherAssetsOwnership): string {
    return JSON.stringify(value);
}
