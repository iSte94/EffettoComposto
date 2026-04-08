/**
 * Next.js Instrumentation Hook
 *
 * Viene eseguito UNA SOLA VOLTA all'avvio del server Node.js.
 * Usato per avviare task in background come lo scheduler Mutui Market.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Solo lato server (non durante il build né nel browser)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/mutui-market/scheduler");
    startScheduler();
  }
}
