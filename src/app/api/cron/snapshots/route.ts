import { NextRequest, NextResponse } from "next/server";
import { refreshAllSnapshots } from "@/lib/snapshot-scheduler";

/**
 * GET /api/cron/snapshots
 * Endpoint per forzare il refresh degli snapshot di tutti gli utenti.
 * Protetto da CRON_SECRET nell'header Authorization.
 *
 * Configurazione cron (crontab sul VPS):
 *   0 0 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain/api/cron/snapshots
 */
export async function GET(req: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) {
            const authHeader = req.headers.get("authorization");
            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        console.log(`[Cron] Snapshot refresh avviato: ${new Date().toISOString()}`);

        const result = await refreshAllSnapshots();

        console.log(`[Cron] Snapshot refresh completato: ${result.updated} aggiornati, ${result.skipped} saltati, ${result.errors} errori`);

        return NextResponse.json({
            message: "Snapshot refresh completato",
            timestamp: new Date().toISOString(),
            ...result,
        });
    } catch (error) {
        console.error("[Cron] Snapshot refresh errore:", error);
        return NextResponse.json({ error: "Errore durante il refresh snapshot" }, { status: 500 });
    }
}
