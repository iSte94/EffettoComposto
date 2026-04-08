import yahooFinance from "yahoo-finance2";

async function run() {
  try {
    const quote = await yahooFinance.quote("VWCE.DE");
    console.log("Price VWCE.DE:", quote.regularMarketPrice);
  } catch(e) { console.error("Error:", e.message); }
}
run();
