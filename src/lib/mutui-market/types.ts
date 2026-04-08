// === Tipi per Mutui Market (scraping MutuiSupermarket.it) ===

/** Parametri per la richiesta all'API MutuiSupermarket */
export interface ScraperParams {
  ImportoMutuo: number;
  ValoreImmobile: number;
  Durata: number;
  TipoTasso: "F" | "V";
  Finalita: string;
  ProvinciaImmobile: string;
  ProvinciaDomicilio: string;
  EtaRichiedente: number;
  RedditoMensile: number;
  ClasseEnergetica: string | null;
}

/** Singola offerta mutuo parsata dall'API */
export interface MortgageOffer {
  istituto: string;
  nomeMutuo: string;
  tipoCanale: string; // "Online" | "Filiale"
  rata: number;
  tan: number;
  taeg: number;
  speseIstruttoria: number;
  spesePerizia: number;
  descCalcoloTasso: string;
  descAssicurazioni: string;
  descSpeseIniziali: string;
}

/** Dati cached nel DB */
export interface MortgageMarketData {
  tipoTasso: "F" | "V";
  durata: number;
  offerte: MortgageOffer[];
  scrapedAt: string; // ISO date
}

/** Combinazione tipo tasso + durata */
export interface ScrapeCombination {
  tipoTasso: "F" | "V";
  durata: number;
}

/** Risposta API MutuiSupermarket (struttura parziale) */
export interface MutuiSupermarketResponse {
  OutputMutui?: RawMortgageOffer[];
}

/** Offerta grezza dall'API (campi originali) */
export interface RawMortgageOffer {
  Istituto?: string;
  NomeMutuo?: string;
  TipoCanale?: string;
  Rata?: number;
  Tan?: number;
  Taeg?: number;
  SpeseIstruttoria?: number;
  SpesePerizia?: number;
  Desc_CalcoloTasso?: string;
  Desc_Assicurazioni?: string;
  Desc_SpeseIniziali?: string;
}
