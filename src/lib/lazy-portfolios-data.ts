export interface PortfolioAssetAllocation {
  stocks: number;      // Azioni (%)
  bonds: number;       // Obbligazioni (%)
  commodities: number; // Materie prime / Oro (%)
  cash: number;        // Liquidità / Short term (%)
}

export interface PortfolioEtf {
  ticker: string;
  name: string;
  isin: string;
  ter: number;
  weight: number;
  description: string;
}

export interface PeriodStats {
  returnPct: number;       // Rendimento annualizzato (%)
  stdDevPct: number;       // Deviazione standard (volatilità) (%)
  sharpeRatio: number;     // Indice di Sharpe
  maxDrawdownPct: number;  // Massimo Drawdown (%)
}

export interface PortfolioStats {
  usd: PeriodStats;
  usdToEur: PeriodStats;
  eur: PeriodStats;
}

export interface LazyPortfolio {
  id: string;
  name: string;
  category: "conservative" | "balanced" | "aggressive" | "special";
  description: string;
  author: string;
  terUsd: number;
  terEur: number;
  allocation: PortfolioAssetAllocation;
  etfsUsd: PortfolioEtf[];
  etfsEur: PortfolioEtf[];
  stats: {
    "1985-2020": PortfolioStats;
    "2000-2020": PortfolioStats;
    "2010-2020": PortfolioStats;
  };
}

export const LAZY_PORTFOLIOS: LazyPortfolio[] = [
  {
    id: "golden-butterfly",
    name: "Golden Butterfly",
    category: "balanced",
    author: "Tyler (PortfolioCharts.com)",
    description: "Ispirato al Permanent Portfolio, mira a stabilità e crescita costante combinando asset volatili ma non correlati. Eccellente protezione contro l'inflazione e drawdown storicamente molto contenuti.",
    terUsd: 0.18,
    terEur: 0.29,
    allocation: { stocks: 40, bonds: 20, commodities: 20, cash: 20 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 20, description: "Azionario USA Total Market (Large Cap)" },
      { ticker: "IJS", name: "iShares S&P Small-Cap 600 Value", isin: "US4642874659", ter: 0.18, weight: 20, description: "Azionario USA Small Cap Value" },
      { ticker: "TLT", name: "iShares 20+ Year Treasury Bond", isin: "US4642874329", ter: 0.15, weight: 20, description: "Obbligazionario Governativo USA Lungo Termine" },
      { ticker: "SHY", name: "iShares 1-3 Year Treasury Bond", isin: "US4642874576", ter: 0.15, weight: 20, description: "Obbligazionario Governativo USA Breve Termine" },
      { ticker: "GLD", name: "SPDR Gold Trust", isin: "US78463V1044", ter: 0.40, weight: 20, description: "Oro fisico" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 20, description: "Azionario Area Euro Large & Mid Cap" },
      { ticker: "CSEMUS", name: "iShares MSCI EMU Small Cap UCITS ETF", isin: "IE00B3VWMM18", ter: 0.58, weight: 20, description: "Azionario Area Euro Small Cap" },
      { ticker: "X15E", name: "Xtrackers Eurozone Gov Bond 15-30 UCITS ETF", isin: "LU0290357507", ter: 0.15, weight: 20, description: "Obbligazionario Governativo Eurozona 15-30Y" },
      { ticker: "EM13", name: "Amundi Euro Government Bond 1-3Y UCITS ETF", isin: "LU1650487413", ter: 0.15, weight: 20, description: "Obbligazionario Governativo Eurozona 1-3Y" },
      { ticker: "XAD1", name: "Xtrackers Physical Gold EUR Hedged ETC", isin: "DE000A1EK0G3", ter: 0.59, weight: 20, description: "Oro fisico con copertura valutaria EUR" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.01, stdDevPct: 7.67, sharpeRatio: 1.04, maxDrawdownPct: 18.63 },
        usdToEur: { returnPct: 7.03, stdDevPct: 12.95, sharpeRatio: 0.54, maxDrawdownPct: 38.30 },
        eur: { returnPct: 6.64, stdDevPct: 6.14, sharpeRatio: 1.08, maxDrawdownPct: 21.00 }
      },
      "2000-2020": {
        usd: { returnPct: 7.68, stdDevPct: 8.43, sharpeRatio: 0.91, maxDrawdownPct: 19.91 },
        usdToEur: { returnPct: 6.18, stdDevPct: 11.18, sharpeRatio: 0.55, maxDrawdownPct: 29.00 },
        eur: { returnPct: 5.83, stdDevPct: 7.36, sharpeRatio: 0.79, maxDrawdownPct: 21.29 }
      },
      "2010-2020": {
        usd: { returnPct: 7.76, stdDevPct: 7.35, sharpeRatio: 1.06, maxDrawdownPct: 16.68 },
        usdToEur: { returnPct: 8.51, stdDevPct: 9.62, sharpeRatio: 0.89, maxDrawdownPct: 17.64 },
        eur: { returnPct: 5.84, stdDevPct: 7.89, sharpeRatio: 0.74, maxDrawdownPct: 19.56 }
      }
    }
  },
  {
    id: "all-weather",
    name: "All Weather",
    category: "conservative",
    author: "Ray Dalio (Bridgewater)",
    description: "Progettato per performare bene in qualsiasi stagione economica: crescita economica, recessione, inflazione e deflazione. Ottima protezione con obbligazioni a lungo termine e materie prime.",
    terUsd: 0.18,
    terEur: 0.19,
    allocation: { stocks: 30, bonds: 55, commodities: 15, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 30, description: "Azionario USA" },
      { ticker: "TLT", name: "iShares 20+ Year Treasury Bond", isin: "US4642874329", ter: 0.15, weight: 40, description: "Obbligazionario Governativo USA Lungo Termine" },
      { ticker: "IEI", name: "iShares 3-7 Year Treasury Bond", isin: "US4642874402", ter: 0.15, weight: 15, description: "Obbligazionario Governativo USA Medio Termine" },
      { ticker: "GLD", name: "SPDR Gold Trust", isin: "US78463V1044", ter: 0.40, weight: 7.5, description: "Oro fisico" },
      { ticker: "GSG", name: "iShares S&P GSCI Commodity Index", isin: "US46428R1023", ter: 0.75, weight: 7.5, description: "Materie prime diversificate" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 30, description: "Azionario Area Euro" },
      { ticker: "X15E", name: "Xtrackers Eurozone Gov Bond 15-30 UCITS ETF", isin: "LU0290357507", ter: 0.15, weight: 40, description: "Obbligazionario Governativo Eurozona 15-30Y" },
      { ticker: "EM57", name: "Amundi Euro Government Bond 5-7Y UCITS ETF", isin: "LU1287023003", ter: 0.15, weight: 15, description: "Obbligazionario Governativo Eurozona 5-7Y" },
      { ticker: "XAD1", name: "Xtrackers Physical Gold EUR Hedged ETC", isin: "DE000A1EK0G3", ter: 0.59, weight: 7.5, description: "Oro fisico coperto in EUR" },
      { ticker: "CRB", name: "Amundi Bloomberg Equal-weight Commodity ex-Agri UCITS ETF", isin: "LU1829218749", ter: 0.30, weight: 7.5, description: "Materie prime diversificate in EUR" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 7.12, stdDevPct: 6.25, sharpeRatio: 1.14, maxDrawdownPct: 12.40 },
        usdToEur: { returnPct: 6.22, stdDevPct: 12.10, sharpeRatio: 0.51, maxDrawdownPct: 32.50 },
        eur: { returnPct: 6.08, stdDevPct: 5.75, sharpeRatio: 1.06, maxDrawdownPct: 14.80 }
      },
      "2000-2020": {
        usd: { returnPct: 6.85, stdDevPct: 6.55, sharpeRatio: 1.05, maxDrawdownPct: 13.10 },
        usdToEur: { returnPct: 5.48, stdDevPct: 10.45, sharpeRatio: 0.52, maxDrawdownPct: 24.10 },
        eur: { returnPct: 5.65, stdDevPct: 6.20, sharpeRatio: 0.91, maxDrawdownPct: 15.65 }
      },
      "2010-2020": {
        usd: { returnPct: 6.52, stdDevPct: 5.80, sharpeRatio: 1.12, maxDrawdownPct: 10.40 },
        usdToEur: { returnPct: 7.42, stdDevPct: 8.22, sharpeRatio: 0.90, maxDrawdownPct: 11.20 },
        eur: { returnPct: 5.12, stdDevPct: 6.55, sharpeRatio: 0.78, maxDrawdownPct: 12.50 }
      }
    }
  },
  {
    id: "permanent",
    name: "Permanent Portfolio",
    category: "conservative",
    author: "Harry Browne",
    description: "Basato sull'allocazione paritetica al 25% su quattro macro-asset per difendere il capitale in qualsiasi scenario di inflazione, deflazione, recessione o crescita. Massima protezione.",
    terUsd: 0.18,
    terEur: 0.25,
    allocation: { stocks: 25, bonds: 25, commodities: 25, cash: 25 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 25, description: "Azionario USA" },
      { ticker: "BIL", name: "SPDR Bloomberg 1-3 Month T-Bill", isin: "US78463V8072", ter: 0.14, weight: 25, description: "Obbligazionario Governativo USA Ultrabreve (Cash)" },
      { ticker: "TLT", name: "iShares 20+ Year Treasury Bond", isin: "US4642874329", ter: 0.15, weight: 25, description: "Obbligazionario Governativo USA Lungo Termine" },
      { ticker: "GLD", name: "SPDR Gold Trust", isin: "US78463V1044", ter: 0.40, weight: 25, description: "Oro fisico" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 25, description: "Azionario Area Euro" },
      { ticker: "C3M", name: "Amundi ETF Govies 0-6 Months EuroMTS", isin: "FR0010754200", ter: 0.14, weight: 25, description: "Obbligazionario Governativo Eurozona Ultrabreve" },
      { ticker: "X15E", name: "Xtrackers Eurozone Gov Bond 15-30 UCITS ETF", isin: "LU0290357507", ter: 0.15, weight: 25, description: "Obbligazionario Governativo Eurozona Lungo Termine" },
      { ticker: "XAD1", name: "Xtrackers Physical Gold EUR Hedged ETC", isin: "DE000A1EK0G3", ter: 0.59, weight: 25, description: "Oro fisico coperto in EUR" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 6.82, stdDevPct: 5.24, sharpeRatio: 1.30, maxDrawdownPct: 12.60 },
        usdToEur: { returnPct: 5.82, stdDevPct: 11.20, sharpeRatio: 0.52, maxDrawdownPct: 31.40 },
        eur: { returnPct: 5.62, stdDevPct: 4.80, sharpeRatio: 1.17, maxDrawdownPct: 11.80 }
      },
      "2000-2020": {
        usd: { returnPct: 6.55, stdDevPct: 5.50, sharpeRatio: 1.19, maxDrawdownPct: 13.20 },
        usdToEur: { returnPct: 5.12, stdDevPct: 9.80, sharpeRatio: 0.52, maxDrawdownPct: 22.10 },
        eur: { returnPct: 5.38, stdDevPct: 5.10, sharpeRatio: 1.05, maxDrawdownPct: 12.30 }
      },
      "2010-2020": {
        usd: { returnPct: 5.48, stdDevPct: 4.90, sharpeRatio: 1.12, maxDrawdownPct: 9.80 },
        usdToEur: { returnPct: 6.38, stdDevPct: 7.20, sharpeRatio: 0.89, maxDrawdownPct: 10.40 },
        eur: { returnPct: 4.22, stdDevPct: 5.45, sharpeRatio: 0.77, maxDrawdownPct: 10.80 }
      }
    }
  },
  {
    id: "couch-potato",
    name: "Couch Potato",
    category: "balanced",
    author: "Scott Burns",
    description: "La semplicità assoluta: metà portafoglio in azioni per agganciare la crescita globale, l'altra metà in obbligazioni indicizzate all'inflazione per difendersi. Perfetto per un approccio passive no-stress.",
    terUsd: 0.11,
    terEur: 0.105,
    allocation: { stocks: 50, bonds: 50, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 50, description: "Azionario USA" },
      { ticker: "TIP", name: "iShares TIPS Bond", isin: "US4642871689", ter: 0.19, weight: 50, description: "Obbligazionario USA Indicizzato all'inflazione" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 50, description: "Azionario Area Euro" },
      { ticker: "EMIG", name: "Amundi Euro Government Inflation Linked Bond UCITS ETF", isin: "LU1650491282", ter: 0.09, weight: 50, description: "Obbligazionario Eurozona Indicizzato all'inflazione" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 7.62, stdDevPct: 8.12, sharpeRatio: 0.94, maxDrawdownPct: 24.20 },
        usdToEur: { returnPct: 6.58, stdDevPct: 13.10, sharpeRatio: 0.50, maxDrawdownPct: 39.50 },
        eur: { returnPct: 5.88, stdDevPct: 7.10, sharpeRatio: 0.83, maxDrawdownPct: 22.40 }
      },
      "2000-2020": {
        usd: { returnPct: 6.45, stdDevPct: 8.60, sharpeRatio: 0.75, maxDrawdownPct: 24.80 },
        usdToEur: { returnPct: 4.88, stdDevPct: 11.20, sharpeRatio: 0.44, maxDrawdownPct: 27.60 },
        eur: { returnPct: 5.12, stdDevPct: 7.80, sharpeRatio: 0.66, maxDrawdownPct: 22.90 }
      },
      "2010-2020": {
        usd: { returnPct: 6.90, stdDevPct: 7.40, sharpeRatio: 0.93, maxDrawdownPct: 15.40 },
        usdToEur: { returnPct: 7.88, stdDevPct: 9.30, sharpeRatio: 0.85, maxDrawdownPct: 16.20 },
        eur: { returnPct: 4.88, stdDevPct: 7.90, sharpeRatio: 0.62, maxDrawdownPct: 18.20 }
      }
    }
  },
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    category: "aggressive",
    author: "Warren Buffett",
    description: "L'allocazione suggerita dall'oracolo di Omaha nel suo testamento per la moglie: 90% nel mercato azionario a basso costo (S&P 500) e 10% in titoli di stato a breve termine. Molto aggressivo.",
    terUsd: 0.05,
    terEur: 0.13,
    allocation: { stocks: 90, bonds: 10, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VV", name: "Vanguard Large-Cap", isin: "US9229086379", ter: 0.04, weight: 90, description: "Azionario USA Large Cap" },
      { ticker: "SHY", name: "iShares 1-3 Year Treasury Bond", isin: "US4642874576", ter: 0.15, weight: 10, description: "Obbligazionario USA Breve Termine" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 90, description: "Azionario Area Euro (proxy 90% azioni)" },
      { ticker: "EM13", name: "Amundi Euro Government Bond 1-3Y UCITS ETF", isin: "LU1650487413", ter: 0.15, weight: 10, description: "Obbligazionario Eurozona Breve Termine" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 10.42, stdDevPct: 14.12, sharpeRatio: 0.74, maxDrawdownPct: 44.80 },
        usdToEur: { returnPct: 9.38, stdDevPct: 17.50, sharpeRatio: 0.54, maxDrawdownPct: 48.60 },
        eur: { returnPct: 7.95, stdDevPct: 14.90, sharpeRatio: 0.53, maxDrawdownPct: 46.20 }
      },
      "2000-2020": {
        usd: { returnPct: 7.22, stdDevPct: 13.90, sharpeRatio: 0.52, maxDrawdownPct: 45.10 },
        usdToEur: { returnPct: 5.65, stdDevPct: 16.20, sharpeRatio: 0.35, maxDrawdownPct: 45.90 },
        eur: { returnPct: 5.12, stdDevPct: 16.50, sharpeRatio: 0.31, maxDrawdownPct: 49.50 }
      },
      "2010-2020": {
        usd: { returnPct: 12.45, stdDevPct: 12.10, sharpeRatio: 1.03, maxDrawdownPct: 18.50 },
        usdToEur: { returnPct: 13.50, stdDevPct: 13.80, sharpeRatio: 0.98, maxDrawdownPct: 19.10 },
        eur: { returnPct: 8.52, stdDevPct: 14.20, sharpeRatio: 0.60, maxDrawdownPct: 22.10 }
      }
    }
  },
  {
    id: "simple-path",
    name: "Simple Path to Wealth",
    category: "aggressive",
    author: "JL Collins",
    description: "Sponsorizzato nel famoso libro 'The Simple Path to Wealth': un portafoglio semplicissimo con il 75% in azionario totale e il 25% in obbligazionario totale. Un classico per la fase di accumulo.",
    terUsd: 0.03,
    terEur: 0.14,
    allocation: { stocks: 75, bonds: 25, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 75, description: "Azionario USA" },
      { ticker: "BND", name: "Vanguard Total Bond Market", isin: "US9219097683", ter: 0.03, weight: 25, description: "Obbligazionario USA" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 75, description: "Azionario Area Euro" },
      { ticker: "EYLD", name: "WisdomTree EUR Aggr Bond Enhanced Yield", isin: "IE00BDD2MC07", ter: 0.18, weight: 25, description: "Obbligazionario Eurozona Aggregato" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 9.15, stdDevPct: 11.20, sharpeRatio: 0.82, maxDrawdownPct: 35.20 },
        usdToEur: { returnPct: 8.12, stdDevPct: 14.80, sharpeRatio: 0.55, maxDrawdownPct: 43.10 },
        eur: { returnPct: 7.22, stdDevPct: 11.10, sharpeRatio: 0.65, maxDrawdownPct: 37.20 }
      },
      "2000-2020": {
        usd: { returnPct: 6.82, stdDevPct: 11.10, sharpeRatio: 0.61, maxDrawdownPct: 35.80 },
        usdToEur: { returnPct: 5.35, stdDevPct: 13.50, sharpeRatio: 0.40, maxDrawdownPct: 37.10 },
        eur: { returnPct: 5.48, stdDevPct: 12.30, sharpeRatio: 0.45, maxDrawdownPct: 37.80 }
      },
      "2010-2020": {
        usd: { returnPct: 10.22, stdDevPct: 9.80, sharpeRatio: 1.04, maxDrawdownPct: 15.60 },
        usdToEur: { returnPct: 11.12, stdDevPct: 11.30, sharpeRatio: 0.98, maxDrawdownPct: 16.40 },
        eur: { returnPct: 7.25, stdDevPct: 10.90, sharpeRatio: 0.67, maxDrawdownPct: 19.30 }
      }
    }
  },
  {
    id: "three-funds-bogleheads",
    name: "Bogleheads Three Funds",
    category: "aggressive",
    author: "Taylor Larimore (Bogleheads)",
    description: "Il leggendario portafoglio a tre fondi che copre l'intero mercato azionario USA, l'azionario internazionale ex-USA, e il mercato obbligazionario totale. Massima diversificazione geografica e semplicità.",
    terUsd: 0.05,
    terEur: 0.20,
    allocation: { stocks: 80, bonds: 20, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 50, description: "Azionario USA" },
      { ticker: "VEU", name: "Vanguard FTSE All-World ex-US", isin: "US92204Y7035", ter: 0.08, weight: 30, description: "Azionario Internazionale ex-USA" },
      { ticker: "BND", name: "Vanguard Total Bond Market", isin: "US9219097683", ter: 0.03, weight: 20, description: "Obbligazionario USA" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 50, description: "Azionario Area Euro" },
      { ticker: "CM9", name: "Amundi MSCI World ex EMU UCITS ETF", isin: "FR0010756114", ter: 0.35, weight: 30, description: "Azionario Sviluppato ex-Eurozona" },
      { ticker: "EYLD", name: "WisdomTree EUR Aggr Bond Enhanced Yield", isin: "IE00BDD2MC07", ter: 0.18, weight: 20, description: "Obbligazionario Eurozona Aggregato" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.85, stdDevPct: 11.80, sharpeRatio: 0.75, maxDrawdownPct: 37.10 },
        usdToEur: { returnPct: 7.82, stdDevPct: 15.20, sharpeRatio: 0.51, maxDrawdownPct: 44.50 },
        eur: { returnPct: 6.95, stdDevPct: 11.20, sharpeRatio: 0.62, maxDrawdownPct: 38.50 }
      },
      "2000-2020": {
        usd: { returnPct: 6.12, stdDevPct: 11.80, sharpeRatio: 0.52, maxDrawdownPct: 38.20 },
        usdToEur: { returnPct: 4.65, stdDevPct: 14.10, sharpeRatio: 0.33, maxDrawdownPct: 39.50 },
        eur: { returnPct: 5.12, stdDevPct: 12.50, sharpeRatio: 0.41, maxDrawdownPct: 39.80 }
      },
      "2010-2020": {
        usd: { returnPct: 9.35, stdDevPct: 10.45, sharpeRatio: 0.89, maxDrawdownPct: 17.20 },
        usdToEur: { returnPct: 10.15, stdDevPct: 11.90, sharpeRatio: 0.85, maxDrawdownPct: 18.10 },
        eur: { returnPct: 6.78, stdDevPct: 11.10, sharpeRatio: 0.61, maxDrawdownPct: 20.10 }
      }
    }
  },
  {
    id: "talmud",
    name: "Talmud Portfolio",
    category: "aggressive",
    author: "Maimonide / Talmud",
    description: "Ispirato al passaggio del Talmud (ca 1200 anni fa): 'Ognuno dovrebbe dividere i suoi soldi in tre parti: un terzo in terra (immobili), un terzo in affari (azioni) e un terzo a portata di mano (obbligazioni/liquidità).'",
    terUsd: 0.06,
    terEur: 0.21,
    allocation: { stocks: 67, bonds: 33, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 34, description: "Azionario USA (Affari)" },
      { ticker: "VNQ", name: "Vanguard Real Estate", isin: "US9229085538", ter: 0.12, weight: 33, description: "Immobiliare USA REITs (Terra)" },
      { ticker: "BND", name: "Vanguard Total Bond Market", isin: "US9219097683", ter: 0.03, weight: 33, description: "Obbligazionario USA (In mano)" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 34, description: "Azionario Area Euro" },
      { ticker: "XDER", name: "Xtrackers FTSE EPRA/NAREIT Europe Real Estate", isin: "LU0290358224", ter: 0.33, weight: 33, description: "Immobiliare Europeo REITs" },
      { ticker: "EYLD", name: "WisdomTree EUR Aggr Bond Enhanced Yield", isin: "IE00BDD2MC07", ter: 0.18, weight: 33, description: "Obbligazionario Eurozona Aggregato" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.92, stdDevPct: 11.20, sharpeRatio: 0.80, maxDrawdownPct: 34.60 },
        usdToEur: { returnPct: 7.92, stdDevPct: 14.50, sharpeRatio: 0.55, maxDrawdownPct: 41.50 },
        eur: { returnPct: 7.15, stdDevPct: 10.20, sharpeRatio: 0.70, maxDrawdownPct: 32.50 }
      },
      "2000-2020": {
        usd: { returnPct: 6.95, stdDevPct: 11.25, sharpeRatio: 0.62, maxDrawdownPct: 35.10 },
        usdToEur: { returnPct: 5.42, stdDevPct: 13.20, sharpeRatio: 0.41, maxDrawdownPct: 34.80 },
        eur: { returnPct: 5.80, stdDevPct: 11.20, sharpeRatio: 0.52, maxDrawdownPct: 33.10 }
      },
      "2010-2020": {
        usd: { returnPct: 8.82, stdDevPct: 9.90, sharpeRatio: 0.89, maxDrawdownPct: 18.20 },
        usdToEur: { returnPct: 9.68, stdDevPct: 11.10, sharpeRatio: 0.87, maxDrawdownPct: 17.80 },
        eur: { returnPct: 6.12, stdDevPct: 10.20, sharpeRatio: 0.60, maxDrawdownPct: 19.80 }
      }
    }
  },
  {
    id: "swensen",
    name: "David Swensen Yale Portfolio",
    category: "balanced",
    author: "David Swensen (Yale Endowment)",
    description: "Creato dallo storico gestore del fondo di dotazione di Yale. Riduce il peso dell'azionario domestico a favore di immobiliari (REITs), mercati emergenti e titoli indicizzati all'inflazione per una diversificazione istituzionale.",
    terUsd: 0.13,
    terEur: 0.22,
    allocation: { stocks: 70, bonds: 30, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 30, description: "Azionario USA" },
      { ticker: "VNQ", name: "Vanguard Real Estate", isin: "US9229085538", ter: 0.12, weight: 20, description: "Immobiliare USA REITs" },
      { ticker: "VEU", name: "Vanguard FTSE All-World ex-US", isin: "US92204Y7035", ter: 0.08, weight: 15, description: "Azionario Sviluppato ex-USA" },
      { ticker: "EEM", name: "iShares MSCI Emerging Markets", isin: "US4642872349", ter: 0.69, weight: 5, description: "Azionario Mercati Emergenti" },
      { ticker: "IEI", name: "iShares 3-7 Year Treasury Bond", isin: "US4642874402", ter: 0.15, weight: 15, description: "Obbligazionario Governativo USA Medio Termine" },
      { ticker: "TIP", name: "iShares TIPS Bond", isin: "US4642871689", ter: 0.19, weight: 15, description: "Obbligazionario USA Indicizzato all'inflazione" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 30, description: "Azionario Area Euro" },
      { ticker: "XDER", name: "Xtrackers FTSE EPRA/NAREIT Europe Real Estate", isin: "LU0290358224", ter: 0.33, weight: 20, description: "Immobiliare Europeo REITs" },
      { ticker: "CM9", name: "Amundi MSCI World ex EMU UCITS ETF", isin: "FR0010756114", ter: 0.35, weight: 15, description: "Azionario Sviluppato ex-Eurozona" },
      { ticker: "EMKT", name: "Amundi MSCI Emerging Markets UCITS ETF", isin: "LU1437017350", ter: 0.20, weight: 5, description: "Azionario Mercati Emergenti" },
      { ticker: "EM57", name: "Amundi Euro Government Bond 5-7Y UCITS ETF", isin: "LU1287023003", ter: 0.15, weight: 15, description: "Obbligazionario Governativo Eurozona 5-7Y" },
      { ticker: "EMIG", name: "Amundi Euro Government Inflation Linked Bond UCITS ETF", isin: "LU1650491282", ter: 0.09, weight: 15, description: "Obbligazionario Eurozona Indicizzato all'inflazione" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.45, stdDevPct: 10.15, sharpeRatio: 0.83, maxDrawdownPct: 30.50 },
        usdToEur: { returnPct: 7.42, stdDevPct: 13.90, sharpeRatio: 0.53, maxDrawdownPct: 37.80 },
        eur: { returnPct: 6.78, stdDevPct: 9.35, sharpeRatio: 0.72, maxDrawdownPct: 29.50 }
      },
      "2000-2020": {
        usd: { returnPct: 6.85, stdDevPct: 10.30, sharpeRatio: 0.66, maxDrawdownPct: 31.20 },
        usdToEur: { returnPct: 5.38, stdDevPct: 12.60, sharpeRatio: 0.42, maxDrawdownPct: 31.40 },
        eur: { returnPct: 5.92, stdDevPct: 9.90, sharpeRatio: 0.59, maxDrawdownPct: 29.20 }
      },
      "2010-2020": {
        usd: { returnPct: 8.12, stdDevPct: 8.90, sharpeRatio: 0.91, maxDrawdownPct: 15.20 },
        usdToEur: { returnPct: 8.98, stdDevPct: 10.20, sharpeRatio: 0.88, maxDrawdownPct: 15.60 },
        eur: { returnPct: 5.75, stdDevPct: 9.12, sharpeRatio: 0.63, maxDrawdownPct: 17.50 }
      }
    }
  },
  {
    id: "coffee-house",
    name: "Coffee House Portfolio",
    category: "balanced",
    author: "Bill Schultheis",
    description: "Promuove una rigorosa diversificazione: 60% in azioni ripartite equamente su 6 diversi stili/geografie per catturare vari premi al rischio, e 40% in obbligazioni totali per attutire la volatilità.",
    terUsd: 0.07,
    terEur: 0.32,
    allocation: { stocks: 60, bonds: 40, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VV", name: "Vanguard Large-Cap", isin: "US9229086379", ter: 0.04, weight: 10, description: "Azionario USA Large Cap" },
      { ticker: "VTV", name: "Vanguard Value", isin: "US9229087443", ter: 0.04, weight: 10, description: "Azionario USA Large Cap Value" },
      { ticker: "IJR", name: "iShares Core S&P Small-Cap", isin: "US4642871507", ter: 0.06, weight: 10, description: "Azionario USA Small Cap" },
      { ticker: "IJS", name: "iShares S&P Small-Cap 600 Value", isin: "US4642874659", ter: 0.18, weight: 10, description: "Azionario USA Small Cap Value" },
      { ticker: "VEU", name: "Vanguard FTSE All-World ex-US", isin: "US92204Y7035", ter: 0.08, weight: 10, description: "Azionario Internazionale ex-USA" },
      { ticker: "VNQ", name: "Vanguard Real Estate", isin: "US9229085538", ter: 0.12, weight: 10, description: "Immobiliare USA REITs" },
      { ticker: "BND", name: "Vanguard Total Bond Market", isin: "US9219097683", ter: 0.03, weight: 40, description: "Obbligazionario USA" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 10, description: "Azionario Area Euro Large & Mid Cap" },
      { ticker: "D5BL", name: "Xtrackers MSCI Europe Value UCITS ETF", isin: "LU0486851024", ter: 0.15, weight: 10, description: "Azionario Europeo Value" },
      { ticker: "CSEMUS", name: "iShares MSCI EMU Small Cap UCITS ETF", isin: "IE00B3VWMM18", ter: 0.58, weight: 10, description: "Azionario Area Euro Small Cap" },
      { ticker: "XXSC", name: "Xtrackers MSCI Europe Small Cap UCITS ETF", isin: "LU0322253906", ter: 0.30, weight: 10, description: "Azionario Europeo Small Cap (Value equiv.)" },
      { ticker: "CM9", name: "Amundi MSCI World ex EMU UCITS ETF", isin: "FR0010756114", ter: 0.35, weight: 10, description: "Azionario Sviluppato ex-Eurozona" },
      { ticker: "XDER", name: "Xtrackers FTSE EPRA/NAREIT Europe Real Estate", isin: "LU0290358224", ter: 0.33, weight: 10, description: "Immobiliare Europeo REITs" },
      { ticker: "EYLD", name: "WisdomTree EUR Aggr Bond Enhanced Yield", isin: "IE00BDD2MC07", ter: 0.18, weight: 40, description: "Obbligazionario Eurozona Aggregato" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.56, stdDevPct: 9.35, sharpeRatio: 0.92, maxDrawdownPct: 24.50 },
        usdToEur: { returnPct: 7.52, stdDevPct: 13.50, sharpeRatio: 0.56, maxDrawdownPct: 37.20 },
        eur: { returnPct: 6.85, stdDevPct: 8.65, sharpeRatio: 0.79, maxDrawdownPct: 23.40 }
      },
      "2000-2020": {
        usd: { returnPct: 6.90, stdDevPct: 9.50, sharpeRatio: 0.72, maxDrawdownPct: 25.10 },
        usdToEur: { returnPct: 5.48, stdDevPct: 12.10, sharpeRatio: 0.45, maxDrawdownPct: 28.20 },
        eur: { returnPct: 5.95, stdDevPct: 9.10, sharpeRatio: 0.65, maxDrawdownPct: 24.10 }
      },
      "2010-2020": {
        usd: { returnPct: 7.92, stdDevPct: 8.20, sharpeRatio: 0.96, maxDrawdownPct: 14.80 },
        usdToEur: { returnPct: 8.85, stdDevPct: 9.60, sharpeRatio: 0.92, maxDrawdownPct: 14.90 },
        eur: { returnPct: 5.68, stdDevPct: 8.45, sharpeRatio: 0.67, maxDrawdownPct: 16.50 }
      }
    }
  },
  {
    id: "world-stocks",
    name: "World Stocks (100% Azionario)",
    category: "aggressive",
    author: "Bogleheads core",
    description: "Un singolo ETF per investire in tutto il mercato azionario globale. Massima crescita potenziale a lungo termine accettando forti fluttuazioni e drawdown significativi durante le crisi.",
    terUsd: 0.08,
    terEur: 0.45,
    allocation: { stocks: 100, bonds: 0, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VT", name: "Vanguard Total World Stock", isin: "US9220427424", ter: 0.08, weight: 100, description: "Azionario Globale All-Cap" }
    ],
    etfsEur: [
      { ticker: "ACWI", name: "Amundi MSCI All Country World UCITS ETF", isin: "LU1829220216", ter: 0.45, weight: 100, description: "Azionario Globale (Paesi Sviluppati ed Emergenti)" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 9.85, stdDevPct: 15.20, sharpeRatio: 0.65, maxDrawdownPct: 50.20 },
        usdToEur: { returnPct: 8.82, stdDevPct: 18.50, sharpeRatio: 0.48, maxDrawdownPct: 53.10 },
        eur: { returnPct: 7.82, stdDevPct: 14.80, sharpeRatio: 0.53, maxDrawdownPct: 49.50 }
      },
      "2000-2020": {
        usd: { returnPct: 6.22, stdDevPct: 15.30, sharpeRatio: 0.41, maxDrawdownPct: 50.80 },
        usdToEur: { returnPct: 4.75, stdDevPct: 17.50, sharpeRatio: 0.27, maxDrawdownPct: 48.90 },
        eur: { returnPct: 5.12, stdDevPct: 16.20, sharpeRatio: 0.32, maxDrawdownPct: 50.20 }
      },
      "2010-2020": {
        usd: { returnPct: 9.68, stdDevPct: 12.80, sharpeRatio: 0.76, maxDrawdownPct: 21.20 },
        usdToEur: { returnPct: 10.55, stdDevPct: 14.30, sharpeRatio: 0.74, maxDrawdownPct: 21.60 },
        eur: { returnPct: 7.95, stdDevPct: 13.90, sharpeRatio: 0.57, maxDrawdownPct: 23.50 }
      }
    }
  },
  {
    id: "world-bond",
    name: "World Bond (100% Obbligazionario)",
    category: "conservative",
    author: "Bogleheads core",
    description: "Per chi cerca la massima stabilità e protezione del capitale. Composto esclusivamente da obbligazioni governative a medio termine. Rendimenti modesti ma volatilità storicamente minima.",
    terUsd: 0.15,
    terEur: 0.15,
    allocation: { stocks: 0, bonds: 100, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "IEF", name: "iShares 7-10 Year Treasury Bond", isin: "US4642872422", ter: 0.15, weight: 100, description: "Obbligazionario Governativo USA 7-10Y" }
    ],
    etfsEur: [
      { ticker: "X710", name: "Xtrackers II Eurozone Gov Bond 7-10 UCITS ETF", isin: "LU0290357259", ter: 0.15, weight: 100, description: "Obbligazionario Governativo Eurozona 7-10Y" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 5.82, stdDevPct: 4.80, sharpeRatio: 1.21, maxDrawdownPct: 9.20 },
        usdToEur: { returnPct: 4.85, stdDevPct: 11.20, sharpeRatio: 0.43, maxDrawdownPct: 29.50 },
        eur: { returnPct: 5.12, stdDevPct: 4.25, sharpeRatio: 1.20, maxDrawdownPct: 8.50 }
      },
      "2000-2020": {
        usd: { returnPct: 5.15, stdDevPct: 4.90, sharpeRatio: 1.05, maxDrawdownPct: 9.50 },
        usdToEur: { returnPct: 3.65, stdDevPct: 9.80, sharpeRatio: 0.37, maxDrawdownPct: 18.20 },
        eur: { returnPct: 4.95, stdDevPct: 4.50, sharpeRatio: 1.10, maxDrawdownPct: 8.80 }
      },
      "2010-2020": {
        usd: { returnPct: 3.92, stdDevPct: 4.60, sharpeRatio: 0.85, maxDrawdownPct: 8.10 },
        usdToEur: { returnPct: 4.82, stdDevPct: 6.80, sharpeRatio: 0.71, maxDrawdownPct: 8.50 },
        eur: { returnPct: 3.82, stdDevPct: 4.10, sharpeRatio: 0.93, maxDrawdownPct: 8.60 }
      }
    }
  },
  {
    id: "dedalo-four",
    name: "Dedalo Four",
    category: "balanced",
    author: "Dedalo Invest",
    description: "Un portafoglio moderno creato appositamente per investitori dell'Eurozona: 80% azionario globale ampiamente diversificato e coperto dal rischio cambio, combinato con un 20% di obbligazionario globale hedged.",
    terUsd: 0.05,
    terEur: 0.16,
    allocation: { stocks: 80, bonds: 20, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VT", name: "Vanguard Total World Stock", isin: "US9220427424", ter: 0.08, weight: 25, description: "Azionario Globale" },
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 30, description: "Azionario USA" },
      { ticker: "VGK", name: "Vanguard FTSE Europe ETF", isin: "US9219088572", ter: 0.08, weight: 25, description: "Azionario Europeo" },
      { ticker: "BNDX", name: "Vanguard Total International Bond", isin: "US92190H6073", ter: 0.07, weight: 20, description: "Obbligazionario Internazionale ex-USA" }
    ],
    etfsEur: [
      { ticker: "IUSQ", name: "iShares MSCI ACWI UCITS ETF", isin: "IE00B6R52758", ter: 0.20, weight: 25, description: "Azionario Globale All-Country" },
      { ticker: "USEUWH", name: "MSCI USA Hedged EUR UCITS ETF", isin: "LU0562201375", ter: 0.15, weight: 30, description: "Azionario USA con copertura EUR" },
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 25, description: "Azionario Area Euro" },
      { ticker: "AGGH", name: "iShares Core Global Aggregate Bond EUR Hedged", isin: "IE00BDBRDM35", ter: 0.10, weight: 20, description: "Obbligazionario Globale coperto in EUR" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.95, stdDevPct: 11.40, sharpeRatio: 0.78, maxDrawdownPct: 36.50 },
        usdToEur: { returnPct: 7.95, stdDevPct: 14.95, sharpeRatio: 0.53, maxDrawdownPct: 42.10 },
        eur: { returnPct: 7.45, stdDevPct: 10.90, sharpeRatio: 0.68, maxDrawdownPct: 34.50 }
      },
      "2000-2020": {
        usd: { returnPct: 6.30, stdDevPct: 11.50, sharpeRatio: 0.54, maxDrawdownPct: 36.90 },
        usdToEur: { returnPct: 4.80, stdDevPct: 13.90, sharpeRatio: 0.34, maxDrawdownPct: 38.10 },
        eur: { returnPct: 5.55, stdDevPct: 12.10, sharpeRatio: 0.46, maxDrawdownPct: 36.80 }
      },
      "2010-2020": {
        usd: { returnPct: 9.80, stdDevPct: 10.10, sharpeRatio: 0.97, maxDrawdownPct: 16.50 },
        usdToEur: { returnPct: 10.60, stdDevPct: 11.45, sharpeRatio: 0.93, maxDrawdownPct: 17.15 },
        eur: { returnPct: 7.20, stdDevPct: 10.60, sharpeRatio: 0.68, maxDrawdownPct: 18.50 }
      }
    }
  },
  {
    id: "bogleheads-four-funds",
    name: "Bogleheads Four Funds",
    category: "aggressive",
    author: "Bogleheads core",
    description: "Un'estensione del classico portafoglio a tre fondi che introduce obbligazioni indicizzate all'inflazione (TIPS). Offre un'ottima esposizione globale riducendo i rischi legati a improvvisi aumenti del costo della vita.",
    terUsd: 0.052,
    terEur: 0.114,
    allocation: { stocks: 80, bonds: 20, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 50, description: "Azionario USA" },
      { ticker: "VXUS", name: "Vanguard Total International Stock", isin: "US9219086188", ter: 0.07, weight: 30, description: "Azionario Internazionale ex-USA" },
      { ticker: "BND", name: "Vanguard Total Bond Market", isin: "US9219088498", ter: 0.03, weight: 10, description: "Obbligazionario USA" },
      { ticker: "TIP", name: "iShares TIPS Bond", isin: "US4642871689", ter: 0.19, weight: 10, description: "Obbligazionario USA Indicizzato all'inflazione" }
    ],
    etfsEur: [
      { ticker: "IUSA", name: "iShares Core S&P 500 UCITS ETF", isin: "IE0031442068", ter: 0.07, weight: 50, description: "Azionario USA S&P 500" },
      { ticker: "IUSQ", name: "iShares MSCI ACWI UCITS ETF", isin: "IE00B6R52758", ter: 0.20, weight: 30, description: "Azionario Globale All-Country" },
      { ticker: "AGGH", name: "iShares Core Global Aggregate Bond EUR Hedged", isin: "IE00BDBRDM35", ter: 0.10, weight: 10, description: "Obbligazionario Globale coperto in EUR" },
      { ticker: "IBCI", name: "iShares Euro Gov Inflation Linked Bond UCITS ETF", isin: "IE00B0M62X26", ter: 0.09, weight: 10, description: "Obbligazionario Eurozona Indicizzato all'inflazione" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.65, stdDevPct: 11.40, sharpeRatio: 0.76, maxDrawdownPct: 35.80 },
        usdToEur: { returnPct: 7.68, stdDevPct: 14.70, sharpeRatio: 0.52, maxDrawdownPct: 42.50 },
        eur: { returnPct: 6.80, stdDevPct: 10.90, sharpeRatio: 0.62, maxDrawdownPct: 36.80 }
      },
      "2000-2020": {
        usd: { returnPct: 6.25, stdDevPct: 11.40, sharpeRatio: 0.55, maxDrawdownPct: 36.20 },
        usdToEur: { returnPct: 4.75, stdDevPct: 13.60, sharpeRatio: 0.35, maxDrawdownPct: 37.50 },
        eur: { returnPct: 5.20, stdDevPct: 12.10, sharpeRatio: 0.43, maxDrawdownPct: 37.90 }
      },
      "2010-2020": {
        usd: { returnPct: 9.15, stdDevPct: 9.90, sharpeRatio: 0.92, maxDrawdownPct: 16.40 },
        usdToEur: { returnPct: 9.95, stdDevPct: 11.30, sharpeRatio: 0.88, maxDrawdownPct: 17.20 },
        eur: { returnPct: 6.62, stdDevPct: 10.60, sharpeRatio: 0.63, maxDrawdownPct: 19.10 }
      }
    }
  },
  {
    id: "no-brainer",
    name: "Bill Bernstein No-Brainer",
    category: "aggressive",
    author: "William Bernstein",
    description: "Creato da William Bernstein. Divide equamente il portafoglio tra quattro grandi asset class, includendo large e small cap USA, azioni internazionali e bond a breve termine per ridurre i rischi con estrema semplicità.",
    terUsd: 0.048,
    terEur: 0.20,
    allocation: { stocks: 75, bonds: 25, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VOO", name: "Vanguard S&P 500", isin: "US9229083246", ter: 0.03, weight: 25, description: "Azionario USA S&P 500" },
      { ticker: "IJR", name: "iShares Core S&P Small-Cap", isin: "US4642871507", ter: 0.06, weight: 25, description: "Azionario USA Small Cap" },
      { ticker: "VEA", name: "Vanguard FTSE Developed Markets", isin: "US9219088168", ter: 0.05, weight: 25, description: "Azionario Paesi Sviluppati ex-USA" },
      { ticker: "BSV", name: "Vanguard Short-Term Bond", isin: "US9229088655", ter: 0.05, weight: 25, description: "Obbligazionario USA a breve termine" }
    ],
    etfsEur: [
      { ticker: "CSPX", name: "iShares Core S&P 500 UCITS ETF USD Acc", isin: "IE00B5BMR087", ter: 0.07, weight: 25, description: "Azionario USA S&P 500 (accumulazione)" },
      { ticker: "IUSN", name: "iShares MSCI World Small Cap UCITS ETF", isin: "IE00BF4RFH31", ter: 0.35, weight: 25, description: "Azionario Globale Small Cap" },
      { ticker: "EUNL", name: "iShares Core MSCI World UCITS ETF", isin: "IE00B4L5Y983", ter: 0.20, weight: 25, description: "Azionario Paesi Sviluppati MSCI World" },
      { ticker: "XEON", name: "Xtrackers II EUR Overnight Rate Swap UCITS ETF", isin: "LU0290358497", ter: 0.10, weight: 25, description: "Liquidità a breve termine (tasso overnight)" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.52, stdDevPct: 11.20, sharpeRatio: 0.76, maxDrawdownPct: 34.20 },
        usdToEur: { returnPct: 7.48, stdDevPct: 14.50, sharpeRatio: 0.52, maxDrawdownPct: 41.20 },
        eur: { returnPct: 6.72, stdDevPct: 10.80, sharpeRatio: 0.62, maxDrawdownPct: 35.50 }
      },
      "2000-2020": {
        usd: { returnPct: 6.42, stdDevPct: 11.10, sharpeRatio: 0.58, maxDrawdownPct: 34.50 },
        usdToEur: { returnPct: 4.95, stdDevPct: 13.20, sharpeRatio: 0.38, maxDrawdownPct: 35.80 },
        eur: { returnPct: 5.35, stdDevPct: 11.80, sharpeRatio: 0.45, maxDrawdownPct: 36.10 }
      },
      "2010-2020": {
        usd: { returnPct: 8.92, stdDevPct: 9.70, sharpeRatio: 0.92, maxDrawdownPct: 15.20 },
        usdToEur: { returnPct: 9.72, stdDevPct: 11.10, sharpeRatio: 0.88, maxDrawdownPct: 15.90 },
        eur: { returnPct: 6.42, stdDevPct: 10.30, sharpeRatio: 0.62, maxDrawdownPct: 17.80 }
      }
    }
  },
  {
    id: "core-four",
    name: "Rick Ferri Core Four",
    category: "aggressive",
    author: "Rick Ferri",
    description: "Ideato da Rick Ferri. Aggiunge i REITs immobiliari ad un nucleo di azioni USA, internazionali e bond total market, offrendo un'eccellente diversificazione con soli quattro strumenti a bassissimo costo.",
    terUsd: 0.047,
    terEur: 0.134,
    allocation: { stocks: 80, bonds: 20, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 48, description: "Azionario USA" },
      { ticker: "VXUS", name: "Vanguard Total International Stock", isin: "US9219086188", ter: 0.07, weight: 24, description: "Azionario Internazionale ex-USA" },
      { ticker: "VNQ", name: "Vanguard Real Estate", isin: "US9229085538", ter: 0.12, weight: 8, description: "Immobiliare USA REITs" },
      { ticker: "BND", name: "Vanguard Total Bond Market", isin: "US9219088498", ter: 0.03, weight: 20, description: "Obbligazionario USA" }
    ],
    etfsEur: [
      { ticker: "IUSA", name: "iShares Core S&P 500 UCITS ETF", isin: "IE0031442068", ter: 0.07, weight: 48, description: "Azionario USA S&P 500" },
      { ticker: "IUSQ", name: "iShares MSCI ACWI UCITS ETF", isin: "IE00B6R52758", ter: 0.20, weight: 24, description: "Azionario Globale All-Country" },
      { ticker: "EPRU", name: "iShares European Property Yield UCITS ETF", isin: "IE00B0M63284", ter: 0.40, weight: 8, description: "Immobiliare Europeo REITs" },
      { ticker: "AGGH", name: "iShares Core Global Aggregate Bond EUR Hedged", isin: "IE00BDBRDM35", ter: 0.10, weight: 20, description: "Obbligazionario Globale coperto in EUR" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.95, stdDevPct: 11.90, sharpeRatio: 0.75, maxDrawdownPct: 38.10 },
        usdToEur: { returnPct: 7.92, stdDevPct: 15.30, sharpeRatio: 0.52, maxDrawdownPct: 45.20 },
        eur: { returnPct: 7.02, stdDevPct: 11.30, sharpeRatio: 0.62, maxDrawdownPct: 39.10 }
      },
      "2000-2020": {
        usd: { returnPct: 6.22, stdDevPct: 11.90, sharpeRatio: 0.52, maxDrawdownPct: 38.90 },
        usdToEur: { returnPct: 4.72, stdDevPct: 14.20, sharpeRatio: 0.33, maxDrawdownPct: 40.20 },
        eur: { returnPct: 5.22, stdDevPct: 12.60, sharpeRatio: 0.41, maxDrawdownPct: 40.50 }
      },
      "2010-2020": {
        usd: { returnPct: 9.45, stdDevPct: 10.50, sharpeRatio: 0.90, maxDrawdownPct: 17.50 },
        usdToEur: { returnPct: 10.25, stdDevPct: 12.00, sharpeRatio: 0.85, maxDrawdownPct: 18.30 },
        eur: { returnPct: 6.85, stdDevPct: 11.20, sharpeRatio: 0.61, maxDrawdownPct: 20.30 }
      }
    }
  },
  {
    id: "ivy-portfolio",
    name: "Meb Faber Ivy",
    category: "balanced",
    author: "Mebane Faber",
    description: "Ispirato ai fondi di dotazione universitari di Harvard e Yale. Suddivide le risorse in parti uguali tra azioni USA, internazionali, obbligazioni, immobili e materie prime, per massimizzare la decorrelazione negli scenari avversi.",
    terUsd: 0.216,
    terEur: 0.224,
    allocation: { stocks: 60, bonds: 20, commodities: 20, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 20, description: "Azionario USA" },
      { ticker: "VEA", name: "Vanguard FTSE Developed Markets", isin: "US9219088168", ter: 0.05, weight: 20, description: "Azionario Paesi Sviluppati ex-USA" },
      { ticker: "BND", name: "Vanguard Total Bond Market", isin: "US9219088498", ter: 0.03, weight: 20, description: "Obbligazionario USA" },
      { ticker: "VNQ", name: "Vanguard Real Estate", isin: "US9229085538", ter: 0.12, weight: 20, description: "Immobiliare USA REITs" },
      { ticker: "DBC", name: "Invesco DB Commodity Index", isin: "US46138G1013", ter: 0.85, weight: 20, description: "Materie prime diversificate" }
    ],
    etfsEur: [
      { ticker: "IUSA", name: "iShares Core S&P 500 UCITS ETF", isin: "IE0031442068", ter: 0.07, weight: 20, description: "Azionario USA S&P 500" },
      { ticker: "EUNL", name: "iShares Core MSCI World UCITS ETF", isin: "IE00B4L5Y983", ter: 0.20, weight: 20, description: "Azionario Paesi Sviluppati MSCI World" },
      { ticker: "AGGH", name: "iShares Core Global Aggregate Bond EUR Hedged", isin: "IE00BDBRDM35", ter: 0.10, weight: 20, description: "Obbligazionario Globale coperto in EUR" },
      { ticker: "EPRU", name: "iShares European Property Yield UCITS ETF", isin: "IE00B0M63284", ter: 0.40, weight: 20, description: "Immobiliare Europeo REITs" },
      { ticker: "CRB", name: "Amundi Bloomberg Equal-weight Commodity ex-Agri UCITS ETF", isin: "LU1829218749", ter: 0.30, weight: 20, description: "Materie prime diversificate" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.12, stdDevPct: 9.85, sharpeRatio: 0.82, maxDrawdownPct: 28.50 },
        usdToEur: { returnPct: 7.12, stdDevPct: 13.50, sharpeRatio: 0.53, maxDrawdownPct: 36.80 },
        eur: { returnPct: 6.32, stdDevPct: 8.85, sharpeRatio: 0.71, maxDrawdownPct: 27.20 }
      },
      "2000-2020": {
        usd: { returnPct: 6.95, stdDevPct: 9.90, sharpeRatio: 0.70, maxDrawdownPct: 29.20 },
        usdToEur: { returnPct: 5.48, stdDevPct: 12.10, sharpeRatio: 0.45, maxDrawdownPct: 30.20 },
        eur: { returnPct: 5.72, stdDevPct: 9.40, sharpeRatio: 0.61, maxDrawdownPct: 28.10 }
      },
      "2010-2020": {
        usd: { returnPct: 7.22, stdDevPct: 8.20, sharpeRatio: 0.88, maxDrawdownPct: 13.80 },
        usdToEur: { returnPct: 8.12, stdDevPct: 9.40, sharpeRatio: 0.86, maxDrawdownPct: 14.10 },
        eur: { returnPct: 5.25, stdDevPct: 8.15, sharpeRatio: 0.64, maxDrawdownPct: 15.20 }
      }
    }
  },
  {
    id: "larry-swedroe",
    name: "Larry Swedroe Eliminate Fat Tails",
    category: "conservative",
    author: "Larry Swedroe",
    description: "Strutturato da Larry Swedroe con un approccio asimmetrico: solo il 30% in azioni, ma fortemente orientate a fattori Small Cap Value (molto volatili ed efficienti), e il 70% in bond a breve termine per azzerare i crolli catastrofici pur mantenendo rendimenti interessanti.",
    terUsd: 0.149,
    terEur: 0.151,
    allocation: { stocks: 30, bonds: 70, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "IJS", name: "iShares S&P Small-Cap 600 Value", isin: "US4642874659", ter: 0.18, weight: 15, description: "Azionario USA Small Cap Value" },
      { ticker: "DLS", name: "WisdomTree International SmallCap Dividend", isin: "US97717X6938", ter: 0.58, weight: 7.5, description: "Azionario Sviluppato ex-USA Small Cap Value" },
      { ticker: "DGS", name: "WisdomTree Emerging Markets SmallCap Dividend", isin: "US97717W4306", ter: 0.58, weight: 7.5, description: "Azionario Mercati Emergenti Small Cap Value" },
      { ticker: "BSV", name: "Vanguard Short-Term Bond", isin: "US9229088655", ter: 0.05, weight: 70, description: "Obbligazionario USA a breve termine" }
    ],
    etfsEur: [
      { ticker: "ZPRV", name: "SPDR MSCI USA Small Cap Value Weighted UCITS", isin: "IE00BSPLC413", ter: 0.30, weight: 15, description: "Azionario USA Small Cap Value" },
      { ticker: "ZPRX", name: "SPDR MSCI Europe Small Cap Value Weighted UCITS", isin: "IE00BSPLC298", ter: 0.30, weight: 7.5, description: "Azionario Europeo Small Cap Value" },
      { ticker: "EIMI", name: "iShares Core MSCI EM IMI UCITS ETF", isin: "IE00BKM4GZ66", ter: 0.18, weight: 7.5, description: "Azionario Mercati Emergenti All-Cap" },
      { ticker: "XEON", name: "Xtrackers II EUR Overnight Rate Swap UCITS ETF", isin: "LU0290358497", ter: 0.10, weight: 70, description: "Liquidità a breve termine (tasso overnight)" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 6.92, stdDevPct: 5.62, sharpeRatio: 1.23, maxDrawdownPct: 10.20 },
        usdToEur: { returnPct: 5.95, stdDevPct: 11.35, sharpeRatio: 0.52, maxDrawdownPct: 29.20 },
        eur: { returnPct: 5.68, stdDevPct: 4.95, sharpeRatio: 1.15, maxDrawdownPct: 9.80 }
      },
      "2000-2020": {
        usd: { returnPct: 6.12, stdDevPct: 5.80, sharpeRatio: 1.05, maxDrawdownPct: 10.50 },
        usdToEur: { returnPct: 4.68, stdDevPct: 9.95, sharpeRatio: 0.47, maxDrawdownPct: 19.50 },
        eur: { returnPct: 5.12, stdDevPct: 5.12, sharpeRatio: 1.00, maxDrawdownPct: 10.12 }
      },
      "2010-2020": {
        usd: { returnPct: 4.88, stdDevPct: 5.12, sharpeRatio: 0.95, maxDrawdownPct: 7.92 },
        usdToEur: { returnPct: 5.72, stdDevPct: 7.02, sharpeRatio: 0.81, maxDrawdownPct: 8.12 },
        eur: { returnPct: 3.95, stdDevPct: 4.90, sharpeRatio: 0.81, maxDrawdownPct: 8.35 }
      }
    }
  },
  {
    id: "israelsen-7twelve",
    name: "Craig Israelsen 7Twelve",
    category: "balanced",
    author: "Craig Israelsen",
    description: "Sviluppato da Craig Israelsen. Suddivide il capitale in 12 parti uguali (8.33% ciascuna) investite in 7 diverse asset class (azioni Large/Mid/Small USA, sviluppate ex-USA, emergenti, real estate, materie prime, oro e bond) per la massima diversificazione strutturale.",
    terUsd: 0.160,
    terEur: 0.191,
    allocation: { stocks: 50, bonds: 33, commodities: 17, cash: 0 },
    etfsUsd: [
      { ticker: "VOO", name: "Vanguard S&P 500 (US Large)", isin: "US9229083246", ter: 0.03, weight: 8.4, description: "Azionario USA Large Cap" },
      { ticker: "VO", name: "Vanguard Mid-Cap ETF", isin: "US9220428034", ter: 0.04, weight: 8.3, description: "Azionario USA Mid Cap" },
      { ticker: "IJR", name: "iShares Core S&P Small-Cap", isin: "US4642871507", ter: 0.06, weight: 8.3, description: "Azionario USA Small Cap" },
      { ticker: "VEA", name: "Vanguard FTSE Developed Markets", isin: "US9219088168", ter: 0.05, weight: 8.4, description: "Azionario Developed ex-USA" },
      { ticker: "VWO", name: "Vanguard FTSE Emerging Markets", isin: "US9220428588", ter: 0.08, weight: 8.3, description: "Azionario Mercati Emergenti" },
      { ticker: "VNQ", name: "Vanguard Real Estate", isin: "US9229085538", ter: 0.12, weight: 8.3, description: "Immobiliare USA REITs" },
      { ticker: "BND", name: "Vanguard Total Bond Market", isin: "US9219088498", ter: 0.03, weight: 8.4, description: "Obbligazionario USA totale" },
      { ticker: "TIP", name: "iShares TIPS Bond", isin: "US4642871689", ter: 0.19, weight: 8.3, description: "Obbligazionario USA indicizzato a inflazione" },
      { ticker: "BNDX", name: "Vanguard Total International Bond", isin: "US92190H6073", ter: 0.07, weight: 8.3, description: "Obbligazionario ex-USA totale" },
      { ticker: "SHY", name: "iShares 1-3 Year Treasury Bond", isin: "US4642874576", ter: 0.15, weight: 8.4, description: "Obbligazionario USA breve termine" },
      { ticker: "GLD", name: "SPDR Gold Trust", isin: "US78463V1044", ter: 0.40, weight: 8.3, description: "Oro fisico" },
      { ticker: "GSG", name: "iShares S&P GSCI Commodity", isin: "US46428R1023", ter: 0.75, weight: 8.3, description: "Materie prime" }
    ],
    etfsEur: [
      { ticker: "IUSA", name: "iShares Core S&P 500 UCITS ETF", isin: "IE0031442068", ter: 0.07, weight: 8.4, description: "Azionario USA Large Cap" },
      { ticker: "XD5U", name: "Xtrackers MSCI USA Mid Cap UCITS", isin: "IE00BJZ2DD56", ter: 0.15, weight: 8.3, description: "Azionario USA Mid Cap" },
      { ticker: "IUSN", name: "iShares MSCI World Small Cap UCITS", isin: "IE00BF4RFH31", ter: 0.35, weight: 8.3, description: "Azionario Globale Small Cap" },
      { ticker: "EUNL", name: "iShares Core MSCI World UCITS ETF", isin: "IE00B4L5Y983", ter: 0.20, weight: 8.4, description: "Azionario Sviluppato globale" },
      { ticker: "EIMI", name: "iShares Core MSCI EM IMI UCITS ETF", isin: "IE00BKM4GZ66", ter: 0.18, weight: 8.3, description: "Azionario Mercati Emergenti" },
      { ticker: "EPRU", name: "iShares European Property Yield UCITS", isin: "IE00B0M63284", ter: 0.40, weight: 8.3, description: "Immobiliare Europeo REITs" },
      { ticker: "AGGH", name: "iShares Core Global Aggregate Bond EUR Hedged", isin: "IE00BDBRDM35", ter: 0.10, weight: 8.4, description: "Obbligazionario Globale coperto in EUR" },
      { ticker: "IBCI", name: "iShares Euro Gov Inflation Linked UCITS", isin: "IE00B0M62X26", ter: 0.09, weight: 8.3, description: "Obbligazionario Eurozona TIPS" },
      { ticker: "VAGF", name: "Vanguard Global Aggregate Bond EUR Hedged UCITS ETF", isin: "IE00BG47KH54", ter: 0.08, weight: 8.3, description: "Obbligazionario Globale coperto" },
      { ticker: "XEON", name: "Xtrackers II EUR Overnight Rate Swap UCITS", isin: "LU0290358497", ter: 0.10, weight: 8.4, description: "Liquidità tasso overnight" },
      { ticker: "SGLN", name: "iShares Physical Gold ETC", isin: "IE00B4ND3602", ter: 0.12, weight: 8.3, description: "Oro fisico" },
      { ticker: "CRB", name: "Amundi Bloomberg Equal-weight Commodity ex-Agri UCITS ETF", isin: "LU1829218749", ter: 0.30, weight: 8.3, description: "Materie prime" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.32, stdDevPct: 9.80, sharpeRatio: 0.85, maxDrawdownPct: 26.20 },
        usdToEur: { returnPct: 7.32, stdDevPct: 13.20, sharpeRatio: 0.55, maxDrawdownPct: 34.50 },
        eur: { returnPct: 6.45, stdDevPct: 8.72, sharpeRatio: 0.74, maxDrawdownPct: 25.10 }
      },
      "2000-2020": {
        usd: { returnPct: 7.02, stdDevPct: 9.92, sharpeRatio: 0.71, maxDrawdownPct: 27.50 },
        usdToEur: { returnPct: 5.55, stdDevPct: 11.90, sharpeRatio: 0.47, maxDrawdownPct: 28.50 },
        eur: { returnPct: 5.82, stdDevPct: 9.15, sharpeRatio: 0.64, maxDrawdownPct: 26.15 }
      },
      "2010-2020": {
        usd: { returnPct: 7.35, stdDevPct: 8.15, sharpeRatio: 0.90, maxDrawdownPct: 13.20 },
        usdToEur: { returnPct: 8.25, stdDevPct: 9.35, sharpeRatio: 0.88, maxDrawdownPct: 13.50 },
        eur: { returnPct: 5.32, stdDevPct: 8.10, sharpeRatio: 0.66, maxDrawdownPct: 14.50 }
      }
    }
  },
  {
    id: "margaritaville",
    name: "Scott Burns Margaritaville",
    category: "balanced",
    author: "Scott Burns",
    description: "Un portafoglio a tre parti uguali (33.3% ciascuna): azioni totali USA, azioni totali internazionali e obbligazioni protette dall'inflazione (TIPS). Creato per essere incredibilmente efficiente ed estremamente facile da gestire.",
    terUsd: 0.097,
    terEur: 0.120,
    allocation: { stocks: 67, bonds: 33, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 33.3, description: "Azionario USA" },
      { ticker: "VXUS", name: "Vanguard Total International Stock", isin: "US9219086188", ter: 0.07, weight: 33.3, description: "Azionario Internazionale ex-USA" },
      { ticker: "TIP", name: "iShares TIPS Bond", isin: "US4642871689", ter: 0.19, weight: 33.4, description: "Obbligazionario USA indicizzato a inflazione" }
    ],
    etfsEur: [
      { ticker: "IUSA", name: "iShares Core S&P 500 UCITS ETF", isin: "IE0031442068", ter: 0.07, weight: 33.3, description: "Azionario USA S&P 500" },
      { ticker: "IUSQ", name: "iShares MSCI ACWI UCITS ETF", isin: "IE00B6R52758", ter: 0.20, weight: 33.3, description: "Azionario Globale All-Country" },
      { ticker: "IBCI", name: "iShares Euro Gov Inflation Linked Bond UCITS", isin: "IE00B0M62X26", ter: 0.09, weight: 33.4, description: "Obbligazionario Eurozona TIPS" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 7.95, stdDevPct: 9.60, sharpeRatio: 0.83, maxDrawdownPct: 28.20 },
        usdToEur: { returnPct: 6.95, stdDevPct: 13.90, sharpeRatio: 0.50, maxDrawdownPct: 41.50 },
        eur: { returnPct: 6.22, stdDevPct: 8.45, sharpeRatio: 0.74, maxDrawdownPct: 24.80 }
      },
      "2000-2020": {
        usd: { returnPct: 6.52, stdDevPct: 9.90, sharpeRatio: 0.66, maxDrawdownPct: 28.50 },
        usdToEur: { returnPct: 4.95, stdDevPct: 12.10, sharpeRatio: 0.41, maxDrawdownPct: 30.10 },
        eur: { returnPct: 5.35, stdDevPct: 8.92, sharpeRatio: 0.60, maxDrawdownPct: 26.20 }
      },
      "2010-2020": {
        usd: { returnPct: 7.82, stdDevPct: 8.52, sharpeRatio: 0.92, maxDrawdownPct: 14.20 },
        usdToEur: { returnPct: 8.72, stdDevPct: 10.02, sharpeRatio: 0.87, maxDrawdownPct: 14.80 },
        eur: { returnPct: 5.62, stdDevPct: 8.85, sharpeRatio: 0.63, maxDrawdownPct: 16.50 }
      }
    }
  },
  {
    id: "gone-fishin",
    name: "Alexander Green Gone Fishin'",
    category: "balanced",
    author: "Alexander Green",
    description: "Un'allocazione molto granularizzata e diversificata ideata da Alexander Green. Comprende azioni USA (large e small cap), europee, del Pacifico e dei mercati emergenti, combinate con bond societari, TIPS, REITs e oro.",
    terUsd: 0.150,
    terEur: 0.180,
    allocation: { stocks: 65, bonds: 30, commodities: 5, cash: 0 },
    etfsUsd: [
      { ticker: "VOO", name: "Vanguard S&P 500", isin: "US9229083246", ter: 0.03, weight: 15, description: "Azionario USA Large Cap" },
      { ticker: "IJR", name: "iShares Core S&P Small-Cap", isin: "US4642871507", ter: 0.06, weight: 15, description: "Azionario USA Small Cap" },
      { ticker: "VGK", name: "Vanguard FTSE Europe", isin: "US9219088572", ter: 0.08, weight: 10, description: "Azionario Europeo" },
      { ticker: "VPL", name: "Vanguard FTSE Pacific", isin: "US9219088408", ter: 0.08, weight: 10, description: "Azionario Pacifico" },
      { ticker: "VWO", name: "Vanguard FTSE Emerging Markets", isin: "US9220428588", ter: 0.08, weight: 10, description: "Azionario Mercati Emergenti" },
      { ticker: "VNQ", name: "Vanguard Real Estate", isin: "US9229085538", ter: 0.12, weight: 5, description: "Immobiliare USA REITs" },
      { ticker: "BSV", name: "Vanguard Short-Term Bond", isin: "US9229088655", ter: 0.05, weight: 10, description: "Obbligazionario breve termine" },
      { ticker: "HYG", name: "iShares iBoxx $ High Yield Corporate Bond", isin: "US4642885135", ter: 0.49, weight: 10, description: "Obbligazionario societario alto rendimento" },
      { ticker: "TIP", name: "iShares TIPS Bond", isin: "US4642871689", ter: 0.19, weight: 10, description: "Obbligazionario indicizzato inflazione" },
      { ticker: "GLD", name: "SPDR Gold Trust", isin: "US78463V1044", ter: 0.40, weight: 5, description: "Oro fisico" }
    ],
    etfsEur: [
      { ticker: "CSPX", name: "iShares Core S&P 500 UCITS ETF USD Acc", isin: "IE00B5BMR087", ter: 0.07, weight: 15, description: "Azionario USA S&P 500 (accumulazione)" },
      { ticker: "IUSN", name: "iShares MSCI World Small Cap UCITS", isin: "IE00BF4RFH31", ter: 0.35, weight: 15, description: "Azionario Globale Small Cap" },
      { ticker: "IMEU", name: "iShares Core MSCI Europe UCITS ETF", isin: "IE00B4K48X80", ter: 0.12, weight: 10, description: "Azionario Europeo" },
      { ticker: "CPXJ", name: "iShares MSCI Pacific ex-Japan UCITS", isin: "IE00B52MJY50", ter: 0.20, weight: 10, description: "Azionario Area Pacifico" },
      { ticker: "EIMI", name: "iShares Core MSCI EM IMI UCITS ETF", isin: "IE00BKM4GZ66", ter: 0.18, weight: 10, description: "Azionario Mercati Emergenti" },
      { ticker: "EPRU", name: "iShares European Property Yield UCITS", isin: "IE00B0M63284", ter: 0.40, weight: 5, description: "Immobiliare Europeo REITs" },
      { ticker: "XEON", name: "Xtrackers II EUR Overnight Rate Swap UCITS", isin: "LU0290358497", ter: 0.10, weight: 10, description: "Liquidità overnight in Euro" },
      { ticker: "IHYG", name: "iShares EUR High Yield Bond UCITS ETF", isin: "IE00B66F4759", ter: 0.50, weight: 10, description: "Obbligazionario societario high yield" },
      { ticker: "IBCI", name: "iShares Euro Gov Inflation Linked Bond UCITS", isin: "IE00B0M62X26", ter: 0.09, weight: 10, description: "Obbligazionario Eurozona TIPS" },
      { ticker: "SGLN", name: "iShares Physical Gold ETC", isin: "IE00B4ND3602", ter: 0.12, weight: 5, description: "Oro fisico" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 8.62, stdDevPct: 10.20, sharpeRatio: 0.84, maxDrawdownPct: 31.20 },
        usdToEur: { returnPct: 7.62, stdDevPct: 13.80, sharpeRatio: 0.55, maxDrawdownPct: 39.50 },
        eur: { returnPct: 6.82, stdDevPct: 9.12, sharpeRatio: 0.75, maxDrawdownPct: 28.50 }
      },
      "2000-2020": {
        usd: { returnPct: 6.92, stdDevPct: 10.35, sharpeRatio: 0.67, maxDrawdownPct: 31.80 },
        usdToEur: { returnPct: 5.42, stdDevPct: 12.50, sharpeRatio: 0.43, maxDrawdownPct: 32.10 },
        eur: { returnPct: 5.92, stdDevPct: 9.60, sharpeRatio: 0.62, maxDrawdownPct: 29.50 }
      },
      "2010-2020": {
        usd: { returnPct: 7.95, stdDevPct: 8.60, sharpeRatio: 0.92, maxDrawdownPct: 14.80 },
        usdToEur: { returnPct: 8.85, stdDevPct: 9.95, sharpeRatio: 0.89, maxDrawdownPct: 15.20 },
        eur: { returnPct: 5.82, stdDevPct: 8.65, sharpeRatio: 0.67, maxDrawdownPct: 17.10 }
      }
    }
  }
  ,
  {
    id: "rick-ferri-core-four",
    name: "Rick Ferri Core Four",
    category: "balanced",
    author: "Rick Ferri",
    description: "Una variante del portafoglio a tre fondi che aggiunge una quota specifica di asset immobiliari (REITs) per maggiore diversificazione e potenziale di reddito.",
    terUsd: 0.06,
    terEur: 0.16,
    allocation: { stocks: 72, bonds: 20, commodities: 0, cash: 8 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 48, description: "Azionario USA" },
      { ticker: "VXUS", name: "Vanguard Total International Stock", isin: "US9220427754", ter: 0.07, weight: 24, description: "Azionario Sviluppato ex-USA" },
      { ticker: "BND", name: "Vanguard Total Bond Market", isin: "US9219097683", ter: 0.03, weight: 20, description: "Obbligazionario USA" },
      { ticker: "VNQ", name: "Vanguard Real Estate", isin: "US9229085538", ter: 0.12, weight: 8, description: "Immobiliare USA REITs" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 48, description: "Azionario Area Euro" },
      { ticker: "CM9", name: "Amundi MSCI World ex EMU UCITS ETF", isin: "FR0010756114", ter: 0.35, weight: 24, description: "Azionario Sviluppato ex-Eurozona" },
      { ticker: "EYLD", name: "WisdomTree EUR Aggr Bond Enhanced Yield", isin: "IE00BDD2MC07", ter: 0.18, weight: 20, description: "Obbligazionario Eurozona Aggregato" },
      { ticker: "XDER", name: "Xtrackers FTSE EPRA/NAREIT Europe Real Estate", isin: "LU0290358224", ter: 0.33, weight: 8, description: "Immobiliare Europeo REITs" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 9.15, stdDevPct: 11.20, sharpeRatio: 0.82, maxDrawdownPct: 35.20 },
        usdToEur: { returnPct: 8.12, stdDevPct: 14.80, sharpeRatio: 0.55, maxDrawdownPct: 43.10 },
        eur: { returnPct: 7.22, stdDevPct: 11.10, sharpeRatio: 0.65, maxDrawdownPct: 37.20 }
      },
      "2000-2020": {
        usd: { returnPct: 6.82, stdDevPct: 11.10, sharpeRatio: 0.61, maxDrawdownPct: 35.80 },
        usdToEur: { returnPct: 5.35, stdDevPct: 13.50, sharpeRatio: 0.40, maxDrawdownPct: 37.10 },
        eur: { returnPct: 5.48, stdDevPct: 12.30, sharpeRatio: 0.45, maxDrawdownPct: 37.80 }
      },
      "2010-2020": {
        usd: { returnPct: 10.22, stdDevPct: 9.80, sharpeRatio: 1.04, maxDrawdownPct: 15.60 },
        usdToEur: { returnPct: 11.12, stdDevPct: 11.30, sharpeRatio: 0.98, maxDrawdownPct: 16.40 },
        eur: { returnPct: 7.25, stdDevPct: 10.90, sharpeRatio: 0.67, maxDrawdownPct: 19.30 }
      }
    }
  },
  {
    id: "bill-bernstein-no-brainer",
    name: "Bill Bernstein No Brainer",
    category: "aggressive",
    author: "William Bernstein",
    description: "Un portafoglio semplice ed elegante diviso in quattro parti uguali: 25% grandi aziende, 25% piccole aziende, 25% azioni internazionali e 25% obbligazioni a breve termine.",
    terUsd: 0.05,
    terEur: 0.18,
    allocation: { stocks: 75, bonds: 25, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VV", name: "Vanguard Large-Cap", isin: "US9229086379", ter: 0.04, weight: 25, description: "Azionario USA Large Cap" },
      { ticker: "IJR", name: "iShares Core S&P Small-Cap", isin: "US4642871507", ter: 0.06, weight: 25, description: "Azionario USA Small Cap" },
      { ticker: "VEU", name: "Vanguard FTSE All-World ex-US", isin: "US92204Y7035", ter: 0.08, weight: 25, description: "Azionario Internazionale ex-USA" },
      { ticker: "SHY", name: "iShares 1-3 Year Treasury Bond", isin: "US4642874576", ter: 0.15, weight: 25, description: "Obbligazionario Governativo USA Breve Termine" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 25, description: "Azionario Area Euro Large & Mid Cap" },
      { ticker: "XXSC", name: "Xtrackers MSCI Europe Small Cap UCITS ETF", isin: "LU0322253906", ter: 0.30, weight: 25, description: "Azionario Europeo Small Cap" },
      { ticker: "CM9", name: "Amundi MSCI World ex EMU UCITS ETF", isin: "FR0010756114", ter: 0.35, weight: 25, description: "Azionario Sviluppato ex-Eurozona" },
      { ticker: "EM13", name: "Amundi Euro Government Bond 1-3Y UCITS ETF", isin: "LU1650487413", ter: 0.15, weight: 25, description: "Obbligazionario Governativo Eurozona 1-3Y" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 9.35, stdDevPct: 12.10, sharpeRatio: 0.77, maxDrawdownPct: 37.50 },
        usdToEur: { returnPct: 8.35, stdDevPct: 15.50, sharpeRatio: 0.54, maxDrawdownPct: 44.50 },
        eur: { returnPct: 7.70, stdDevPct: 11.91, sharpeRatio: 0.65, maxDrawdownPct: 40.40 }
      },
      "2000-2020": {
        usd: { returnPct: 7.15, stdDevPct: 11.90, sharpeRatio: 0.60, maxDrawdownPct: 37.20 },
        usdToEur: { returnPct: 5.65, stdDevPct: 14.10, sharpeRatio: 0.40, maxDrawdownPct: 38.50 },
        eur: { returnPct: 5.85, stdDevPct: 12.50, sharpeRatio: 0.47, maxDrawdownPct: 39.20 }
      },
      "2010-2020": {
        usd: { returnPct: 9.85, stdDevPct: 10.45, sharpeRatio: 0.94, maxDrawdownPct: 16.80 },
        usdToEur: { returnPct: 10.75, stdDevPct: 11.90, sharpeRatio: 0.90, maxDrawdownPct: 17.50 },
        eur: { returnPct: 7.15, stdDevPct: 11.10, sharpeRatio: 0.64, maxDrawdownPct: 19.50 }
      }
    }
  },
  {
    id: "ivy-portfolio",
    name: "Ivy Portfolio",
    category: "balanced",
    author: "Meb Faber",
    description: "Modellato sugli investimenti degli endowment universitari (come Harvard o Yale). Distribuisce il rischio in 5 asset class paritarie (20% ciascuna): azioni USA, azioni internazionali, bond a medio termine, materie prime e immobili.",
    terUsd: 0.15,
    terEur: 0.22,
    allocation: { stocks: 40, bonds: 20, commodities: 20, cash: 20 },
    etfsUsd: [
      { ticker: "VTI", name: "Vanguard Total Stock Market", isin: "US9229087690", ter: 0.03, weight: 20, description: "Azionario USA" },
      { ticker: "VEU", name: "Vanguard FTSE All-World ex-US", isin: "US92204Y7035", ter: 0.08, weight: 20, description: "Azionario Sviluppato ex-USA" },
      { ticker: "IEI", name: "iShares 3-7 Year Treasury Bond", isin: "US4642874402", ter: 0.15, weight: 20, description: "Obbligazionario Governativo USA Medio Termine" },
      { ticker: "GSG", name: "iShares S&P GSCI Commodity Index", isin: "US46428R1023", ter: 0.75, weight: 20, description: "Materie prime diversificate" },
      { ticker: "VNQ", name: "Vanguard Real Estate", isin: "US9229085538", ter: 0.12, weight: 20, description: "Immobiliare USA REITs" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 20, description: "Azionario Area Euro" },
      { ticker: "CM9", name: "Amundi MSCI World ex EMU UCITS ETF", isin: "FR0010756114", ter: 0.35, weight: 20, description: "Azionario Sviluppato ex-Eurozona" },
      { ticker: "EM57", name: "Amundi Euro Government Bond 5-7Y UCITS ETF", isin: "LU1287023003", ter: 0.15, weight: 20, description: "Obbligazionario Governativo Eurozona 5-7Y" },
      { ticker: "CRB", name: "Amundi Bloomberg Equal-weight Commodity ex-Agri UCITS ETF", isin: "LU1829218749", ter: 0.30, weight: 20, description: "Materie prime diversificate in EUR" },
      { ticker: "XDER", name: "Xtrackers FTSE EPRA/NAREIT Europe Real Estate", isin: "LU0290358224", ter: 0.33, weight: 20, description: "Immobiliare Europeo REITs" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 7.95, stdDevPct: 9.80, sharpeRatio: 0.81, maxDrawdownPct: 29.50 },
        usdToEur: { returnPct: 6.92, stdDevPct: 13.50, sharpeRatio: 0.51, maxDrawdownPct: 35.80 },
        eur: { returnPct: 6.25, stdDevPct: 8.85, sharpeRatio: 0.71, maxDrawdownPct: 28.50 }
      },
      "2000-2020": {
        usd: { returnPct: 6.55, stdDevPct: 9.90, sharpeRatio: 0.66, maxDrawdownPct: 30.20 },
        usdToEur: { returnPct: 5.12, stdDevPct: 12.10, sharpeRatio: 0.42, maxDrawdownPct: 31.40 },
        eur: { returnPct: 5.45, stdDevPct: 9.50, sharpeRatio: 0.57, maxDrawdownPct: 29.20 }
      },
      "2010-2020": {
        usd: { returnPct: 7.50, stdDevPct: 8.50, sharpeRatio: 0.88, maxDrawdownPct: 14.50 },
        usdToEur: { returnPct: 8.35, stdDevPct: 9.80, sharpeRatio: 0.85, maxDrawdownPct: 15.20 },
        eur: { returnPct: 5.25, stdDevPct: 8.65, sharpeRatio: 0.61, maxDrawdownPct: 16.80 }
      }
    }
  },
  {
    id: "larry-portfolio",
    name: "Larry Portfolio",
    category: "conservative",
    author: "Larry Swedroe",
    description: "Cerca di minimizzare il rischio estremo concentrando l'azionario sui fattori a maggior rendimento atteso (Small Cap Value e Mercati Emergenti) per il 30%, ammortizzati dal 70% di solidi Titoli di Stato a medio termine.",
    terUsd: 0.20,
    terEur: 0.18,
    allocation: { stocks: 30, bonds: 70, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "IJS", name: "iShares S&P Small-Cap 600 Value", isin: "US4642874659", ter: 0.18, weight: 15, description: "Azionario USA Small Cap Value" },
      { ticker: "EEM", name: "iShares MSCI Emerging Markets", isin: "US4642872349", ter: 0.69, weight: 15, description: "Azionario Mercati Emergenti" },
      { ticker: "IEI", name: "iShares 3-7 Year Treasury Bond", isin: "US4642874402", ter: 0.15, weight: 70, description: "Obbligazionario Governativo USA Medio Termine" }
    ],
    etfsEur: [
      { ticker: "XXSC", name: "Xtrackers MSCI Europe Small Cap UCITS ETF", isin: "LU0322253906", ter: 0.30, weight: 15, description: "Azionario Europeo Small Cap" },
      { ticker: "EMKT", name: "Amundi MSCI Emerging Markets UCITS ETF", isin: "LU1437017350", ter: 0.20, weight: 15, description: "Azionario Mercati Emergenti" },
      { ticker: "EM57", name: "Amundi Euro Government Bond 5-7Y UCITS ETF", isin: "LU1287023003", ter: 0.15, weight: 70, description: "Obbligazionario Governativo Eurozona 5-7Y" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 7.25, stdDevPct: 6.80, sharpeRatio: 1.07, maxDrawdownPct: 15.50 },
        usdToEur: { returnPct: 6.22, stdDevPct: 11.80, sharpeRatio: 0.53, maxDrawdownPct: 31.20 },
        eur: { returnPct: 5.85, stdDevPct: 6.10, sharpeRatio: 0.96, maxDrawdownPct: 17.80 }
      },
      "2000-2020": {
        usd: { returnPct: 6.95, stdDevPct: 7.10, sharpeRatio: 0.98, maxDrawdownPct: 16.20 },
        usdToEur: { returnPct: 5.55, stdDevPct: 10.50, sharpeRatio: 0.53, maxDrawdownPct: 23.50 },
        eur: { returnPct: 5.48, stdDevPct: 6.45, sharpeRatio: 0.85, maxDrawdownPct: 16.90 }
      },
      "2010-2020": {
        usd: { returnPct: 6.12, stdDevPct: 6.30, sharpeRatio: 0.97, maxDrawdownPct: 11.20 },
        usdToEur: { returnPct: 7.02, stdDevPct: 8.50, sharpeRatio: 0.83, maxDrawdownPct: 12.50 },
        eur: { returnPct: 4.88, stdDevPct: 6.80, sharpeRatio: 0.72, maxDrawdownPct: 13.50 }
      }
    }
  },
  {
    id: "paul-merriman-ultimate",
    name: "Paul Merriman Ultimate (Simplified)",
    category: "aggressive",
    author: "Paul Merriman",
    description: "Versione concentrata al 100% azionario per massimizzare la crescita, con un'equa esposizione a grandi imprese, piccole imprese (value factor), mercati sviluppati ed emergenti.",
    terUsd: 0.08,
    terEur: 0.24,
    allocation: { stocks: 100, bonds: 0, commodities: 0, cash: 0 },
    etfsUsd: [
      { ticker: "VV", name: "Vanguard Large-Cap", isin: "US9229086379", ter: 0.04, weight: 25, description: "Azionario USA Large Cap" },
      { ticker: "IJR", name: "iShares Core S&P Small-Cap", isin: "US4642871507", ter: 0.06, weight: 25, description: "Azionario USA Small Cap" },
      { ticker: "VEU", name: "Vanguard FTSE All-World ex-US", isin: "US92204Y7035", ter: 0.08, weight: 25, description: "Azionario Sviluppato ex-USA" },
      { ticker: "EEM", name: "iShares MSCI Emerging Markets", isin: "US4642872349", ter: 0.69, weight: 25, description: "Azionario Mercati Emergenti" }
    ],
    etfsEur: [
      { ticker: "CSEMU", name: "iShares Core MSCI EMU UCITS ETF", isin: "IE00B53QG562", ter: 0.12, weight: 25, description: "Azionario Area Euro Large & Mid Cap" },
      { ticker: "XXSC", name: "Xtrackers MSCI Europe Small Cap UCITS ETF", isin: "LU0322253906", ter: 0.30, weight: 25, description: "Azionario Europeo Small Cap" },
      { ticker: "CM9", name: "Amundi MSCI World ex EMU UCITS ETF", isin: "FR0010756114", ter: 0.35, weight: 25, description: "Azionario Sviluppato ex-Eurozona" },
      { ticker: "EMKT", name: "Amundi MSCI Emerging Markets UCITS ETF", isin: "LU1437017350", ter: 0.20, weight: 25, description: "Azionario Mercati Emergenti" }
    ],
    stats: {
      "1985-2020": {
        usd: { returnPct: 10.25, stdDevPct: 16.50, sharpeRatio: 0.62, maxDrawdownPct: 52.40 },
        usdToEur: { returnPct: 9.22, stdDevPct: 19.50, sharpeRatio: 0.47, maxDrawdownPct: 55.20 },
        eur: { returnPct: 8.12, stdDevPct: 15.80, sharpeRatio: 0.51, maxDrawdownPct: 51.50 }
      },
      "2000-2020": {
        usd: { returnPct: 7.22, stdDevPct: 16.80, sharpeRatio: 0.43, maxDrawdownPct: 53.80 },
        usdToEur: { returnPct: 5.65, stdDevPct: 18.50, sharpeRatio: 0.31, maxDrawdownPct: 51.90 },
        eur: { returnPct: 5.95, stdDevPct: 17.20, sharpeRatio: 0.35, maxDrawdownPct: 52.50 }
      },
      "2010-2020": {
        usd: { returnPct: 9.85, stdDevPct: 14.20, sharpeRatio: 0.69, maxDrawdownPct: 23.50 },
        usdToEur: { returnPct: 10.75, stdDevPct: 15.50, sharpeRatio: 0.69, maxDrawdownPct: 24.20 },
        eur: { returnPct: 7.82, stdDevPct: 14.80, sharpeRatio: 0.53, maxDrawdownPct: 25.50 }
      }
    }
  }
];
