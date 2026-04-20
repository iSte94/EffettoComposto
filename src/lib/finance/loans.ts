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
    owner?: "person1" | "person2";
}

export interface MortgagePaymentParams {
    /** Capitale finanziato in euro (>= 0). */
    loanAmount: number;
    /** Tasso annuo nominale in percentuale (>= 0). Es. 3.5 per 3,5%. */
    annualRatePct: number;
    /** Durata del mutuo in anni (>= 0). Valori frazionari ammessi. */
    years: number;
}

export interface MortgagePaymentResult {
    /** Rata mensile costante (ammortamento francese) in euro. */
    monthlyPayment: number;
    /** Totale versato a fine piano in euro. */
    totalPaid: number;
    /** Totale interessi pagati in euro. */
    totalInterest: number;
    /** Numero totale di rate. */
    numPayments: number;
    /** Tasso mensile effettivo (decimale). */
    monthlyRate: number;
}

/**
 * Calcolo della rata di un mutuo a tasso fisso con ammortamento francese.
 *
 * Formula standard:
 *   R = P * i * (1+i)^n / ((1+i)^n - 1)
 *
 * Edge-case che la formula diretta NON gestisce (e che invece qui sono coperti):
 *   - `annualRatePct = 0` → la formula diretta restituisce 0/0 = NaN.
 *     Il mutuo a tasso zero e' un caso reale (prestiti agevolati, tra
 *     familiari, promozioni auto) e la rata corretta e' `loanAmount / n`.
 *   - `years = 0` o `numPayments = 0` → denominatore 0, risultato Infinity.
 *     Un mutuo di durata zero non ha senso finanziario: ritorniamo 0 invece
 *     di inquinare i calcoli a valle con Infinity.
 *   - Input NaN/negativi → normalizzati a 0 per evitare che un campo form
 *     vuoto propaghi NaN in tutta la dashboard.
 *
 * Senza questi guard la dashboard del Simulatore Mutuo mostrava "€NaN" al
 * primo utente che digitava `rate = 0` (consentito dall'HTML `min="0"` sul
 * campo input), e "€Infinity" con `years = 0`, invalidando DTI, profittabilita'
 * e confronto costo opportunita' in un colpo solo.
 */
export function calculateMortgagePayment(params: MortgagePaymentParams): MortgagePaymentResult {
    const loanAmount = Number.isFinite(params.loanAmount) ? Math.max(0, params.loanAmount) : 0;
    const annualRatePct = Number.isFinite(params.annualRatePct) ? Math.max(0, params.annualRatePct) : 0;
    const years = Number.isFinite(params.years) ? Math.max(0, params.years) : 0;

    const monthlyRate = (annualRatePct / 100) / 12;
    const numPayments = years * 12;

    if (loanAmount === 0 || numPayments === 0) {
        return { monthlyPayment: 0, totalPaid: 0, totalInterest: 0, numPayments, monthlyRate };
    }

    let monthlyPayment: number;
    if (monthlyRate === 0) {
        // Mutuo a tasso zero: rata = capitale / n.
        monthlyPayment = loanAmount / numPayments;
    } else {
        const factor = Math.pow(1 + monthlyRate, numPayments);
        monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);
    }

    const totalPaid = monthlyPayment * numPayments;
    const totalInterest = Math.max(0, totalPaid - loanAmount);

    return { monthlyPayment, totalPaid, totalInterest, numPayments, monthlyRate };
}

/**
 * Debito residuo al mese `monthsPassed` di un mutuo a tasso fisso francese.
 *
 * Formula chiusa: D_k = P * ((1+i)^n - (1+i)^k) / ((1+i)^n - 1)
 *
 * Gestisce gli stessi edge-case di `calculateMortgagePayment`:
 * tasso zero (ammortamento lineare), durata zero, input invalidi.
 */
export function calculateMortgageRemainingDebt(params: {
    loanAmount: number;
    annualRatePct: number;
    years: number;
    monthsPassed: number;
}): number {
    const loanAmount = Number.isFinite(params.loanAmount) ? Math.max(0, params.loanAmount) : 0;
    const annualRatePct = Number.isFinite(params.annualRatePct) ? Math.max(0, params.annualRatePct) : 0;
    const years = Number.isFinite(params.years) ? Math.max(0, params.years) : 0;
    const monthsPassed = Number.isFinite(params.monthsPassed) ? Math.max(0, params.monthsPassed) : 0;

    const numPayments = years * 12;
    if (loanAmount === 0 || numPayments === 0) return loanAmount;
    if (monthsPassed >= numPayments) return 0;

    const monthlyRate = (annualRatePct / 100) / 12;
    if (monthlyRate === 0) {
        return Math.max(0, loanAmount - (loanAmount / numPayments) * monthsPassed);
    }

    const factorN = Math.pow(1 + monthlyRate, numPayments);
    const factorK = Math.pow(1 + monthlyRate, monthsPassed);
    return Math.max(0, loanAmount * (factorN - factorK) / (factorN - 1));
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
