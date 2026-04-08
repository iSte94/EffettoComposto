import yahooFinance from "yahoo-finance2";
async function run() {
  const quote = await yahooFinance.quote("VWCE.DE");
  console.log("Price:", quote.regularMarketPrice);
}
run();
