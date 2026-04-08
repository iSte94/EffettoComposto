import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Fetch current Bitcoin price in EUR from Binance
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCEUR', {
            next: { revalidate: 60 } // Cache for 60 seconds
        });

        if (!response.ok) {
            throw new Error('Failed to fetch BTC price');
        }

        const data = await response.json();
        const btcPriceEur = parseFloat(data.price) || 0;

        return NextResponse.json({ price: btcPriceEur });
    } catch (error) {
        console.error('BTC Fetch Error:', error);
        return NextResponse.json({ error: 'Failed to fetch Bitcoin price' }, { status: 500 });
    }
}
