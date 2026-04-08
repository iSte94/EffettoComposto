export interface ExistingLoan {
    id: string;
    name: string;
    category: "Auto" | "Casa" | "Personale" | "Arredamento" | "Altro";
    installment: number;
    startDate: string; // YYYY-MM
    endDate: string; // YYYY-MM
    originalAmount?: number;
    interestRate?: number;
    currentRemainingDebt?: number;
    isVariable?: boolean; // Se true, la rata viene ricalcolata e non presa da 'installment'
}

export const calculateRemainingDebt = (loan?: ExistingLoan): number => {
    if (!loan) return 0;
    if (!loan.startDate || !loan.endDate) return 0;

    const start = new Date(loan.startDate + "-01");
    const end = new Date(loan.endDate + "-01");
    const now = new Date();

    const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

    // Calcolo "mesi passati" considerando il pagamento della rata il 30 di ogni mese.
    let monthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

    // Se oggi non è ancora il 30 del mese (o fine mese per febbraio), la rata del mese corrente non è ancora stata pagata
    const isEndOfMonth = now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() < 30 && !isEndOfMonth) {
        monthsPassed -= 1;
    }

    const remainingMonths = totalMonths - monthsPassed;

    if (remainingMonths <= 0) return 0;

    if (loan.currentRemainingDebt) {
        return loan.currentRemainingDebt;
    }

    if (monthsPassed < 0) return loan.originalAmount || (loan.installment * totalMonths); // Not started yet

    // Ammortamento Francese Esatto (o simulazione rata crescente)
    if (loan.originalAmount && loan.interestRate && loan.interestRate > 0) {
        const P = loan.originalAmount;
        const i = (loan.interestRate / 100) / 12;
        const n = totalMonths;
        const k = monthsPassed;

        // Rata crescente: la prima rata copre quasi solo gli interessi,
        // poi cresce linearmente. Simuliamo mese per mese.
        if (loan.isVariable && loan.installment && k > 0) {
            const firstPayment = P * i; // La prima rata copre solo interessi
            const delta = (loan.installment - firstPayment) / k; // Incremento lineare mensile
            if (delta > 0) {
                let balance = P;
                for (let m = 0; m < k; m++) {
                    const rata = firstPayment + delta * m;
                    const interest = balance * i;
                    const capital = rata - interest;
                    if (capital > 0) {
                        balance -= capital;
                    }
                }
                return Math.max(0, balance);
            }
        }

        // D_k = P * [ (1+i)^n - (1+i)^k ] / [ (1+i)^n - 1 ]
        const factorN = Math.pow(1 + i, n);
        const factorK = Math.pow(1 + i, k);
        const debtRemaining = P * ((factorN - factorK) / (factorN - 1));
        return Math.max(0, debtRemaining);
    }

    // Linear approximation if we just know original amount
    if (loan.originalAmount && totalMonths > 0) {
        return loan.originalAmount * (remainingMonths / totalMonths);
    }

    // Upper bound estimate (0% interest)
    return loan.installment * remainingMonths;
};

export const calculateGrowthRate = (loan: ExistingLoan, totalMonths: number, currentMonthsPassed: number): number => {
    const P = loan.currentRemainingDebt || loan.originalAmount;
    if (!P || !loan.installment || !loan.interestRate) return 0;

    const n = loan.currentRemainingDebt ? (totalMonths - currentMonthsPassed) : totalMonths;
    if (n <= 0) return 0;

    const i = (loan.interestRate / 100) / 12;
    const R = loan.installment;

    let standardRata = 0;
    if (i > 0) {
        standardRata = (P * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    } else {
        standardRata = P / n;
    }

    if (R >= standardRata * 0.98 || !loan.isVariable) return 0;

    let low = 0;
    let high = 0.05;
    let bestG = 0;
    for (let iter = 0; iter < 40; iter++) {
        const mid = (low + high) / 2;
        let sum = 0;
        const x = (1 + mid) / (1 + i);
        if (Math.abs(x - 1) < 0.000001) {
            sum = (R / (1 + i)) * n;
        } else {
            sum = (R / (1 + i)) * (1 - Math.pow(x, n)) / (1 - x);
        }
        if (sum > P) high = mid;
        else { low = mid; bestG = mid; }
    }
    return bestG;
};

export const getInstallmentAmountForMonth = (loan: ExistingLoan, targetMonthsPassed: number, totalMonths: number, currentMonthsPassed: number): number => {
    const P = loan.currentRemainingDebt || loan.originalAmount;

    if (!loan.installment && P && loan.interestRate && loan.interestRate > 0) {
        const n = loan.currentRemainingDebt ? (totalMonths - currentMonthsPassed) : totalMonths;
        if (n <= 0) return 0;
        const i = (loan.interestRate / 100) / 12;
        return (P * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    }

    const g = calculateGrowthRate(loan, totalMonths, currentMonthsPassed);
    if (g > 0 && loan.installment) {
        const baseMonth = loan.currentRemainingDebt ? currentMonthsPassed : 0;
        const monthDiff = targetMonthsPassed - baseMonth;
        return loan.installment * Math.pow(1 + g, monthDiff);
    }

    return Number(loan.installment) || 0;
};
