import { NextResponse } from "next/server";
import {
  getCachedOffers,
  scrapeAllCombinations,
  isCacheValid,
} from "@/lib/mutui-market/scraper";

/**
 * GET /api/mutui-market?tipoTasso=F&durata=30
 * Restituisce le offerte cached per la combinazione specificata.
 * Se la cache è scaduta (>20h), triggera automaticamente un refresh.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tipoTasso = searchParams.get("tipoTasso") as "F" | "V";
    const durata = parseInt(searchParams.get("durata") || "30", 10);

    if (!tipoTasso || !["F", "V"].includes(tipoTasso)) {
      return NextResponse.json(
        { error: "tipoTasso deve essere F o V" },
        { status: 400 }
      );
    }

    if (![15, 20, 30].includes(durata)) {
      return NextResponse.json(
        { error: "durata deve essere 15, 20 o 30" },
        { status: 400 }
      );
    }

    // Controlla se la cache è valida, altrimenti riscrippa in background
    const cacheValid = await isCacheValid();
    if (!cacheValid) {
      // Scraping in background (non blocking)
      scrapeAllCombinations().catch((err) =>
        console.error("Background scrape failed:", err)
      );
    }

    const result = await getCachedOffers(tipoTasso, durata);

    if (!result) {
      // Nessun dato in cache, forza scraping sincrono
      await scrapeAllCombinations();
      const freshResult = await getCachedOffers(tipoTasso, durata);
      if (!freshResult) {
        return NextResponse.json(
          { error: "Impossibile recuperare i dati. Riprova più tardi." },
          { status: 503 }
        );
      }
      return NextResponse.json(freshResult);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Mutui Market GET error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
