import fetch from 'node-fetch';

async function testApi(url, name) {
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log(`\n\n--- ${name} ---`);
        console.log(`Status: ${res.status}`);
        console.log(`Data: ${text.substring(0, 200)}...`);
    } catch (e) {
        console.log(`\n\n--- ${name} ---`);
        console.log(`Error: ${e.message}`);
    }
}

async function run() {
    // Test 4: Stooq CSV API (Often works for historical, less reliable for live)
    await testApi('https://stooq.com/q/l/?s=vwce.de&f=sd2t2ohlcv&h&e=csv', 'Stooq CSV VWCE.DE');
    await testApi('https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcv&h&e=csv', 'Stooq CSV AAPL.US');
}

run();
