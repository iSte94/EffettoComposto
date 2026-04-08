// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');

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
    // Test 1: Yahoo Finance v8 (Control)
    await testApi('https://query1.finance.yahoo.com/v8/finance/chart/VWCE.DE?interval=1d&range=1d', 'Yahoo Finance');
    
    // Test 2: Yahoo Spark API
    await testApi('https://query1.finance.yahoo.com/v7/finance/spark?symbols=VWCE.DE', 'Yahoo Spark');
    
    // Test 3: Google Finance Scraping (Basic attempt)
    // Note: This is fragile and often blocked, but let's see.
    await testApi('https://www.google.com/finance/quote/VWCE:ETR', 'Google Finance HTML');
    
    // Test 4: Stooq CSV API (Often works for historical, less reliable for live)
    await testApi('https://stooq.com/q/l/?s=vwce.de&f=sd2t2ohlcv&h&e=csv', 'Stooq CSV');
}

run();
