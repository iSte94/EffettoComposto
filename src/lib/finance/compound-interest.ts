// === Simulazione interesse composto + costo del ritardo ===
//
// Modulo puro estratto da `compound-interest-calculator.tsx` per:
//   1. Permettere test di regressione su matematica finanziaria sensibile.
//   2. Correggere il bug del "Costo del Ritardo" che sovrastimava la perdita
//      includendovi la crescita del capitale iniziale, indipendente dal
//      momento in cui partono i versamenti.
//
// === BUG FIX (regressione "delay-cost-overstates-by-initial-growth") ===
//
// Versione precedente (in JSX) calcolava il "Costo del Ritardo (12 mesi)"
// come `balance(year=N) - balance(year=N-1)`, prendendo il delta dell'ULTIMO
// anno della stessa traiettoria. Questa identita' algebrica:
//
//   balance(N) - balance(N-1) =
//       initial * [(1+r)^N - (1+r)^(N-12mesi)]                       <-- crescita del lump iniziale
//     + contribution * (1+r)^(N-12mesi) * ((1+r)^12 - 1) / r          <-- contributi mancanti, capitalizzati
//
// e' MAGGIORE del vero costo del ritardo (i.e. la differenza fra "iniziare
// oggi" e "iniziare fra 12 mesi" a parita' di orizzonte finale), che e'
// costituito SOLO dal secondo termine. Il primo termine (la capitalizzazione
// del lump sum) e' identica nei due scenari: il capitale iniziale rimane
// investito anche durante i 12 mesi di "ritardo" (l'utente non lo preleva,
// semplicemente non aggiunge contributi).
//
// Conseguenza pratica del bug: con `initial = 10.000`, `contribution = 300`,
// `rate = 7%`, `years = 20` la card mostrava ~€16.800 di "costo del ritardo"
// quando il valore corretto e' ~€14.000: una sovrastima del ~20% che oltretutto
// gonfia il "compound loss" derivato (`delayCostNominal - missedContributions`)
// del ~26%. Il bias scala linearmente con il capitale iniziale e cresce con
// l'orizzonte: per piani da €100k iniziali su 30 anni l'errore arriva a
// decine di migliaia di euro.
//
// La correzione simula esplicitamente lo scenario "ritardo" (12 mesi senza
// contributi, poi versamenti regolari per i restanti N*12 - 12 mesi). La
// matematica e' equivalente alla forma chiusa:
//
//   delayCost = contribution * (1+m)^(N-delayMonths) * ((1+m)^delayMonths - 1) / m
//
// per m = tasso mensile e N = mesi totali, ma usiamo il ciclo per non
// duplicare la formula chiusa e per gestire naturalmente il caso m = 0
// (rendimento nullo: delayCost = contribution * delayMonths).

export interface CompoundInterestParams {
    /** Capitale iniziale in euro (>= 0). */
    initialCapital: number;
    /** Versamento mensile costante in euro (>= 0). */
    monthlyContribution: number;
    /** Tasso annuo nominale in percentuale (es. 7 per 7%). */
    annualRatePct: number;
    /** Orizzonte in anni (intero, >= 0). */
    years: number;
}

export interface CompoundInterestPoint {
    year: number;
    label: string;
    /** Totale versato cumulato a fine anno (incluso capitale iniziale). */
    deposited: number;
    /** Interessi maturati cumulati a fine anno (= total - deposited). */
    interest: number;
    /** Capitale totale a fine anno (nominale). */
    total: number;
}

export interface CompoundInterestSimulation {
    /** Saldo nominale a fine orizzonte. */
    finalBalance: number;
    /** Totale versato (capitale iniziale + tutti i contributi). */
    totalDeposited: number;
    /** Interessi totali maturati (= finalBalance - totalDeposited). */
    totalInterest: number;
    /** Punti annuali per grafico/tabella, incluso anno 0 (snapshot iniziale). */
    chartData: CompoundInterestPoint[];
    /**
     * Primo anno in cui interessi maturati > totale versato (effetto compound).
     * `null` se non raggiunto entro l'orizzonte.
     */
    crossoverYear: number | null;
}

export interface DelayCostParams extends CompoundInterestParams {
    /**
     * Mesi di ritardo dell'inizio dei versamenti. Default 12.
     * Il capitale iniziale resta comunque investito durante il ritardo.
     */
    delayMonths?: number;
}

export interface DelayCostResult {
    delayMonths: number;
    /** Saldo finale nominale nello scenario "no delay" (per comodita'). */
    finalBalanceWithoutDelay: number;
    /** Saldo finale nominale nello scenario "delay". */
    finalBalanceWithDelay: number;
    /**
     * Costo del ritardo a fine piano: `finalBalanceWithoutDelay -
     * finalBalanceWithDelay`. Sempre >= 0 (clampato per robustezza
     * numerica): semantica "quanto hai in meno se ritardi".
     */
    nominalCost: number;
    /** Versamenti nominali mancati (`monthlyContribution * delayMonths`). */
    missedContributions: number;
    /**
     * Quota di `nominalCost` imputabile esclusivamente al compounding NON
     * verificatosi sui contributi mancanti: e' il "regalo" di compound che
     * iniziare presto ti fa, al netto del nominale dei versamenti.
     * = max(0, nominalCost - missedContributions).
     */
    compoundLoss: number;
}

function sanitizeFinite(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

/**
 * Simula la crescita di un capitale iniziale con versamenti mensili costanti
 * e capitalizzazione mensile (tasso mensile = annualRate / 12 — convenzione
 * standard del calcolatore "interesse composto" base, identica al codice
 * legacy che ha sostituito).
 */
export function simulateCompoundInterest(params: CompoundInterestParams): CompoundInterestSimulation {
    const initialCapital = Math.max(0, sanitizeFinite(params.initialCapital));
    const monthlyContribution = Math.max(0, sanitizeFinite(params.monthlyContribution));
    const annualRatePct = sanitizeFinite(params.annualRatePct);
    const years = Math.max(0, Math.floor(sanitizeFinite(params.years)));

    const monthlyRate = annualRatePct / 100 / 12;

    let balance = initialCapital;
    let totalDeposited = initialCapital;
    let crossoverYear: number | null = null;

    const chartData: CompoundInterestPoint[] = [{
        year: 0,
        label: "Oggi",
        deposited: initialCapital,
        interest: 0,
        total: initialCapital,
    }];

    for (let year = 1; year <= years; year++) {
        for (let month = 1; month <= 12; month++) {
            balance = balance * (1 + monthlyRate) + monthlyContribution;
            totalDeposited += monthlyContribution;
        }
        const interest = balance - totalDeposited;
        if (crossoverYear === null && interest > totalDeposited) {
            crossoverYear = year;
        }
        chartData.push({
            year,
            label: `Anno ${year}`,
            deposited: Math.round(totalDeposited),
            interest: Math.round(interest),
            total: Math.round(balance),
        });
    }

    return {
        finalBalance: balance,
        totalDeposited,
        totalInterest: balance - totalDeposited,
        chartData,
        crossoverYear,
    };
}

/**
 * Calcola il vero costo del ritardo a parita' di orizzonte finale: differenza
 * fra il saldo nominale di "iniziare oggi" e quello di "iniziare fra
 * `delayMonths` mesi" sullo stesso numero di anni totali.
 *
 * Durante i `delayMonths` di ritardo il capitale iniziale resta comunque
 * investito (l'utente non lo preleva): l'unica differenza fra i due scenari
 * sono i `delayMonths` versamenti che NON vengono fatti. Quei versamenti
 * mancanti sono i piu' "preziosi" perche' avrebbero avuto l'orizzonte piu'
 * lungo per essere capitalizzati.
 *
 * Edge case `years <= 0` o `delayMonths <= 0`: ritorna risultato nullo
 * (no impatto). `delayMonths >= years * 12`: il ritardo copre tutto
 * l'orizzonte, lo scenario "delay" coincide col solo lump iniziale
 * capitalizzato.
 */
export function computeDelayCost(params: DelayCostParams): DelayCostResult {
    const initialCapital = Math.max(0, sanitizeFinite(params.initialCapital));
    const monthlyContribution = Math.max(0, sanitizeFinite(params.monthlyContribution));
    const annualRatePct = sanitizeFinite(params.annualRatePct);
    const years = Math.max(0, Math.floor(sanitizeFinite(params.years)));
    const delayMonths = Math.max(0, Math.floor(sanitizeFinite(params.delayMonths ?? 12, 12)));

    const totalMonths = years * 12;
    const monthlyRate = annualRatePct / 100 / 12;

    if (totalMonths === 0 || delayMonths === 0) {
        const noDelayBalance = simulateBalance(initialCapital, monthlyContribution, monthlyRate, totalMonths, 0);
        return {
            delayMonths,
            finalBalanceWithoutDelay: noDelayBalance,
            finalBalanceWithDelay: noDelayBalance,
            nominalCost: 0,
            missedContributions: 0,
            compoundLoss: 0,
        };
    }

    const finalBalanceWithoutDelay = simulateBalance(initialCapital, monthlyContribution, monthlyRate, totalMonths, 0);
    const finalBalanceWithDelay = simulateBalance(initialCapital, monthlyContribution, monthlyRate, totalMonths, delayMonths);

    const nominalCost = Math.max(0, finalBalanceWithoutDelay - finalBalanceWithDelay);
    const missedContributions = monthlyContribution * Math.min(delayMonths, totalMonths);
    const compoundLoss = Math.max(0, nominalCost - missedContributions);

    return {
        delayMonths,
        finalBalanceWithoutDelay,
        finalBalanceWithDelay,
        nominalCost,
        missedContributions,
        compoundLoss,
    };
}

/**
 * Saldo dopo `totalMonths` mesi a partire da `initial`, con `monthlyContribution`
 * applicato dal mese `delayMonths + 1` in poi (i primi `delayMonths` mesi solo
 * il capitale iniziale capitalizza, senza contributi).
 */
function simulateBalance(
    initial: number,
    monthlyContribution: number,
    monthlyRate: number,
    totalMonths: number,
    delayMonths: number,
): number {
    if (totalMonths <= 0) return initial;
    const effectiveDelay = Math.max(0, Math.min(delayMonths, totalMonths));

    let balance = initial;
    for (let m = 1; m <= effectiveDelay; m++) {
        balance = balance * (1 + monthlyRate);
    }
    for (let m = effectiveDelay + 1; m <= totalMonths; m++) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
    }
    return balance;
}
