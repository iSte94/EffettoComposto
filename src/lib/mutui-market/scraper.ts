import prisma from "@/lib/prisma";
import type {
  ScraperParams,
  MortgageOffer,
  ScrapeCombination,
  MutuiSupermarketResponse,
  RawMortgageOffer,
} from "./types";

// === Configurazione ===

const API_URL = "https://api.mutuisupermarket.it/api/Ricerca";

/** Parametri "mediani" per lo scraping base (uguali per tutti gli utenti) */
const BASE_PARAMS: Omit<ScraperParams, "TipoTasso" | "Durata"> = {
  ImportoMutuo: 200000,
  ValoreImmobile: 250000,
  Finalita: "APC", // Acquisto Prima Casa
  ProvinciaImmobile: "MI",
  ProvinciaDomicilio: "MI",
  EtaRichiedente: 35,
  RedditoMensile: 2400,
  ClasseEnergetica: null,
};

/** Tutte le combinazioni da scrapare (2 tipi × 3 durate = 6) */
const COMBINATIONS: ScrapeCombination[] = [
  { tipoTasso: "F", durata: 15 },
  { tipoTasso: "F", durata: 20 },
  { tipoTasso: "F", durata: 30 },
  { tipoTasso: "V", durata: 15 },
  { tipoTasso: "V", durata: 20 },
  { tipoTasso: "V", durata: 30 },
];

/** TTL della cache: 20 ore (scraping giornaliero, margine di sicurezza) */
const CACHE_TTL_MS = 20 * 60 * 60 * 1000;

// === Funzioni ===

/** Parsa una singola offerta grezza in formato pulito */
function parseOffer(raw: RawMortgageOffer): MortgageOffer {
  return {
    istituto: raw.Istituto || "Sconosciuto",
    nomeMutuo: raw.NomeMutuo || "",
    tipoCanale: raw.TipoCanale || "",
    rata: raw.Rata || 0,
    tan: raw.Tan || 0,
    taeg: raw.Taeg || 0,
    speseIstruttoria: raw.SpeseIstruttoria || 0,
    spesePerizia: raw.SpesePerizia || 0,
    descCalcoloTasso: raw.Desc_CalcoloTasso || "",
    descAssicurazioni: raw.Desc_Assicurazioni || "",
    descSpeseIniziali: raw.Desc_SpeseIniziali || "",
  };
}

/** Scrapa le offerte per una specifica combinazione tasso/durata */
export async function scrapeMutuiMarket(
  tipoTasso: "F" | "V",
  durata: number
): Promise<MortgageOffer[]> {
  const params: ScraperParams = {
    ...BASE_PARAMS,
    TipoTasso: tipoTasso,
    Durata: durata,
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic ZmFpcm9uZTojSDNsbDB3MHJsRCE=",
      Accept: "application/json, text/plain, */*",
      Origin: "https://www.mutuisupermarket.it",
      Referer: "https://www.mutuisupermarket.it/",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(
      `MutuiSupermarket API errore: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as MutuiSupermarketResponse;

  if (!data.OutputMutui || !Array.isArray(data.OutputMutui)) {
    console.warn(
      `MutuiSupermarket: nessun risultato per ${tipoTasso}/${durata}a`
    );
    return [];
  }

  // Parsa e ordina per TAEG (migliore primo)
  return data.OutputMutui.map(parseOffer)
    .filter((o) => o.tan > 0)
    .sort((a, b) => a.taeg - b.taeg);
}

/** Esegue lo scraping di tutte le 6 combinazioni e salva in DB */
export async function scrapeAllCombinations(): Promise<{
  success: number;
  failed: number;
  details: string[];
}> {
  let success = 0;
  let failed = 0;
  const details: string[] = [];

  for (const combo of COMBINATIONS) {
    try {
      const offerte = await scrapeMutuiMarket(combo.tipoTasso, combo.durata);

      // Upsert nel DB
      await prisma.mortgageMarketCache.upsert({
        where: {
          tipoTasso_durata: {
            tipoTasso: combo.tipoTasso,
            durata: combo.durata,
          },
        },
        update: {
          data: JSON.stringify(offerte),
          scrapedAt: new Date(),
        },
        create: {
          tipoTasso: combo.tipoTasso,
          durata: combo.durata,
          data: JSON.stringify(offerte),
        },
      });

      success++;
      details.push(
        `✅ ${combo.tipoTasso === "F" ? "Fisso" : "Variabile"} ${combo.durata}a: ${offerte.length} offerte`
      );

      // Delay tra richieste per non stressare il server
      await new Promise((r) => setTimeout(r, 1500));
    } catch (error) {
      failed++;
      const msg =
        error instanceof Error ? error.message : "Errore sconosciuto";
      details.push(
        `❌ ${combo.tipoTasso === "F" ? "Fisso" : "Variabile"} ${combo.durata}a: ${msg}`
      );
    }
  }

  return { success, failed, details };
}

/** Controlla se la cache è ancora valida (meno di CACHE_TTL_MS) */
export async function isCacheValid(): Promise<boolean> {
  const latest = await prisma.mortgageMarketCache.findFirst({
    orderBy: { scrapedAt: "desc" },
    select: { scrapedAt: true },
  });

  if (!latest) return false;

  return Date.now() - latest.scrapedAt.getTime() < CACHE_TTL_MS;
}

/** Legge le offerte cached dal DB per una specifica combinazione */
export async function getCachedOffers(
  tipoTasso: "F" | "V",
  durata: number
): Promise<{ offerte: MortgageOffer[]; scrapedAt: string } | null> {
  const cached = await prisma.mortgageMarketCache.findUnique({
    where: {
      tipoTasso_durata: { tipoTasso, durata },
    },
  });

  if (!cached) return null;

  try {
    return {
      offerte: JSON.parse(cached.data) as MortgageOffer[],
      scrapedAt: cached.scrapedAt.toISOString(),
    };
  } catch {
    return null;
  }
}
