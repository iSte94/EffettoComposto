const q = "FBTC";
const ALIAS_MAP = {
    'FBTC': ['XS2434891219.SG', 'FBTC.DE', 'FBTC.MI'], // Fidelity Physical Bitcoin
    'PHYSICAL BITCOIN': ['XS2434891219.SG', 'WBIT.HM', 'BTCW.AS'],
    'WBIT': ['WBIT.HM', 'GB00BJYDH287.SG', 'BTCW.AS'], // WisdomTree Physical Bitcoin ETP
    'VWCE': ['VWCE.DE', 'VWCE.MI', 'VWCE.AS']
};
const normalizedQuery = q.toUpperCase().trim();
console.log(ALIAS_MAP[normalizedQuery]);
