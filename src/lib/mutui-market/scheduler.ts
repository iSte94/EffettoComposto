/**
 * Scheduler in-process per task periodici.
 * Esegue lo scraping Mutui Market ogni giorno alle 21:00 (ora locale del server).
 * Nessuna dipendenza esterna: usa setInterval + controllo ora.
 *
 * Viene avviato una sola volta tramite Next.js instrumentation hook.
 */

import { scrapeAllCombinations, isCacheValid } from "@/lib/mutui-market/scraper";

const SCRAPE_HOUR = 21; // Ora dello scraping giornaliero (21:00)
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Controlla ogni ora

let isRunning = false;

/** Esegue lo scraping se l'ora corrisponde o se la cache è scaduta */
async function tick() {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date();
    const currentHour = now.getHours();

    // Esegui a SCRAPE_HOUR oppure se la cache è scaduta (es. primo avvio, riavvio container)
    const cacheValid = await isCacheValid();

    if (currentHour === SCRAPE_HOUR || !cacheValid) {
      console.log(
        `[Scheduler] Mutui Market scraping avviato (ora: ${currentHour}:00, cache valida: ${cacheValid})`
      );
      const result = await scrapeAllCombinations();
      console.log(
        `[Scheduler] Completato: ${result.success} OK, ${result.failed} falliti`
      );
      result.details.forEach((d) => console.log(`  ${d}`));
    }
  } catch (error) {
    console.error("[Scheduler] Errore durante lo scraping:", error);
  } finally {
    isRunning = false;
  }
}

/** Avvia lo scheduler. Chiamare una sola volta. */
export function startScheduler() {
  console.log(
    `[Scheduler] Avviato. Scraping Mutui Market ogni giorno alle ${SCRAPE_HOUR}:00`
  );

  // Primo check subito (popola la cache se vuota)
  // Delay di 10s per dare tempo al server di partire
  setTimeout(() => {
    tick();
  }, 10_000);

  // Poi controlla ogni ora
  setInterval(() => {
    tick();
  }, CHECK_INTERVAL_MS);
}
