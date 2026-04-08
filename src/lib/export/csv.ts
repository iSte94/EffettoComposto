/**
 * Genera un file CSV e lo scarica nel browser.
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell =>
            typeof cell === 'string' && cell.includes(';') ? `"${cell}"` : String(cell)
        ).join(';'))
    ].join('\n');

    // BOM UTF-8 per Excel italiano
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Export storico patrimonio in CSV.
 */
export function exportPatrimonioCSV(history: Array<{
    date: string;
    realEstateValue: number;
    liquidStockValue: number;
    safeHavens: number;
    emergencyFund: number;
    pensionFund: number;
    bitcoinAmount: number;
    bitcoinPrice: number;
    debtsTotal: number;
}>) {
    const headers = [
        'Data', 'Immobili', 'Azioni/ETF', 'Beni Rifugio', 'Fondo Emergenza',
        'Fondo Pensione', 'BTC Quantita', 'BTC Prezzo', 'Debiti', 'Patrimonio Netto'
    ];

    const rows = history.map(item => {
        const netWorth = (item.liquidStockValue || 0) +
            (item.safeHavens || 0) + (item.emergencyFund || 0) + (item.pensionFund || 0) +
            ((item.bitcoinAmount || 0) * (item.bitcoinPrice || 0)) - (item.debtsTotal || 0);

        return [
            item.date.split('T')[0],
            Math.round(item.realEstateValue || 0),
            Math.round(item.liquidStockValue || 0),
            Math.round(item.safeHavens || 0),
            Math.round(item.emergencyFund || 0),
            Math.round(item.pensionFund || 0),
            Number((item.bitcoinAmount || 0).toFixed(8)),
            Math.round(item.bitcoinPrice || 0),
            Math.round(item.debtsTotal || 0),
            Math.round(netWorth),
        ];
    });

    downloadCSV(`patrimonio_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

/**
 * Export piano ammortamento mutuo in CSV.
 */
export function exportAmortizationCSV(params: {
    loanAmount: number;
    rate: number;
    years: number;
}) {
    const { loanAmount, rate, years } = params;
    const monthlyRate = (rate / 100) / 12;
    const numPayments = years * 12;
    const payment = loanAmount > 0
        ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
        : 0;

    const headers = ['Mese', 'Rata', 'Quota Capitale', 'Quota Interessi', 'Debito Residuo'];
    const rows: (string | number)[][] = [];
    let balance = loanAmount;

    for (let month = 1; month <= numPayments; month++) {
        const interest = balance * monthlyRate;
        const principal = payment - interest;
        balance = Math.max(0, balance - principal);

        rows.push([
            month,
            Math.round(payment * 100) / 100,
            Math.round(principal * 100) / 100,
            Math.round(interest * 100) / 100,
            Math.round(balance * 100) / 100,
        ]);
    }

    downloadCSV(`ammortamento_${loanAmount}_${rate}pct_${years}y.csv`, headers, rows);
}
