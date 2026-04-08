import { NextRequest, NextResponse } from "next/server";
import { scrapeAllCombinations } from "@/lib/mutui-market/scraper";

/**
 * GET /api/cron/mutui-market
 * Endpoint per il cron job giornaliero (21:00).
 * Protetto da CRON_SECRET nell'header Authorization.
 *
 * Configurazione cron (crontab sul VPS):
 *   0 21 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain/api/cron/mutui-market
 */
export async function GET(req: NextRequest) {
  try {
    // Verificare il secret (se configurato)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log(
      `[Cron] Mutui Market scraping avviato: ${new Date().toISOString()}`
    );

    const result = await scrapeAllCombinations();

    console.log(
      `[Cron] Mutui Market completato: ${result.success} OK, ${result.failed} falliti`
    );

    return NextResponse.json({
      message: "Scraping cron completato",
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[Cron] Mutui Market errore:", error);
    return NextResponse.json(
      { error: "Errore durante lo scraping cron" },
      { status: 500 }
    );
  }
}
