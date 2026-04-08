const preferredExchanges = ['GER', 'FRA', 'MIL', 'AMS', 'PAR', 'MUN', 'STU', 'HAM', 'DXE', 'CXE'];
const nonEurExchanges = ['EBS', 'LSE', 'NYQ', 'NMS', 'NGM'];

const suggestions = [
  { symbol: 'XBTI-USD.SW', exchange: 'EBS' },
  { symbol: 'BTCE.PA', exchange: 'PAR' },
  { symbol: 'FBTC.SW', exchange: 'EBS' },
  { symbol: 'BTCW.AS', exchange: 'AMS' }
];

suggestions.sort((a, b) => {
    const aIsEuro = preferredExchanges.includes(a.exchange);
    const bIsEuro = preferredExchanges.includes(b.exchange);
            
    const aIsNonEur = nonEurExchanges.includes(a.exchange) || a.symbol.endsWith('.SW') || a.symbol.endsWith('.L');
    const bIsNonEur = nonEurExchanges.includes(b.exchange) || b.symbol.endsWith('.SW') || b.symbol.endsWith('.L');

    if (aIsEuro && !bIsEuro) return -1;
    if (!aIsEuro && bIsEuro) return 1;
            
    if (!aIsNonEur && bIsNonEur) return -1;
    if (aIsNonEur && !bIsNonEur) return 1;

    return 0;
});
console.log(suggestions);
