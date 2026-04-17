import { NextResponse } from 'next/server';
import { scrapeBondPriceByIsin, isValidIsin } from '@/lib/borsa-italiana/bond-scraper';

/**
 * GET /api/bond/quote?isin=IT0005672024
 *
 * Scarica il prezzo di un'obbligazione italiana dal MOT di Borsa Italiana.
 * Usato come fallback per ISIN che Yahoo Finance / Stooq non trovano.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const isin = searchParams.get('isin');

    if (!isin) {
        return NextResponse.json({ error: 'ISIN obbligatorio' }, { status: 400 });
    }

    if (!isValidIsin(isin.toUpperCase())) {
        return NextResponse.json({ error: 'ISIN non valido' }, { status: 400 });
    }

    try {
        const result = await scrapeBondPriceByIsin(isin);
        if (result.price === null) {
            return NextResponse.json(result, { status: 404 });
        }
        return NextResponse.json(result);
    } catch (err) {
        console.error('Bond quote error:', err);
        return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
    }
}
