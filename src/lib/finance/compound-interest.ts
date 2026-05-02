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
 * Tasso annuo effettivo (TAEG-like) derivato da capitalizzazione mensile a
 * partire dal tasso annuo nominale (TAN). Coerente con la convenzione del
 * calcolatore: `monthlyRate = annualRatePct / 100 / 12` produce un rendimento
 * annuo realmente pari a `(1 + monthlyRate)^12 - 1`, leggermente superiore al
 * nominale per via dell'interesse sull'interesse infrannuale.
 *
 * Esempio: TAN 7% -> TAEG ~7.229% (lo 0.23% extra e' il "guadagno" del
 * compounding mensile su quello annuale). E' la stessa idea della distinzione
 * TAN/TAEG sui prestiti: numeri diversi che descrivono lo stesso flusso di
 * cassa, e per questo va comunicata esplicitamente all'utente.
 *
 * Casi limite:
 * - TAN <= -1200% (fattore mensile <= 0): il composto degenera, ritorna -100%.
 * - TAN = 0 -> TAEG = 0 (nessun composto da estrarre).
 * - Input non finiti -> 0 (sanificato).
 */
export function effectiveAnnualRatePct(annualRatePct: number): number {
    const rate = sanitizeFinite(annualRatePct);
    if (rate === 0) return 0;
    const monthlyFactor = 1 + rate / 100 / 12;
    if (monthlyFactor <= 0) return -100;
    return (Math.pow(monthlyFactor, 12) - 1) * 100;
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

export interface InflationAdjustedTotalsParams {
    /** Capitale iniziale in euro (>= 0). E' al tempo 0, quindi gia' in euro odierni. */
    initialCapital: number;
    /** Versamento mensile costante in euro (>= 0). */
    monthlyContribution: number;
    /** Inflazione annua attesa in percentuale (es. 2.5 per 2,5%). */
    inflationRatePct: number;
    /** Orizzonte in anni (intero, >= 0). I valori frazionari vengono troncati. */
    years: number;
}

export interface InflationAdjustedTotalsResult {
    /**
     * Somma dei versamenti deflazionata al potere d'acquisto di OGGI.
     * Ogni contributo mensile viene scontato per (1 + inflazione)^(m/12), cosi'
     * sommando il capitale iniziale (gia' in euro odierni) e i contributi
     * "tradotti" si ottiene un valore che e' confrontabile direttamente con il
     * saldo finale REALE (anch'esso espresso in euro odierni).
     */
    realTotalDeposited: number;
    /**
     * Somma NOMINALE dei versamenti (capitale iniziale + 12·N·contributo).
     * Esposta per confronto / display.
     */
    nominalTotalDeposited: number;
}

/**
 * Calcola la somma dei versamenti deflazionata al potere d'acquisto di oggi.
 *
 * === BUG FIX (regressione "real-gain-mixes-real-and-nominal") ===
 *
 * Il calcolatore mostrava il "Guadagno Reale" come:
 *
 *     realGain = realFinalBalance - totalDeposited     (mix reale / nominale)
 *
 * dove `realFinalBalance` e' il saldo nominale finale DEFLAZIONATO al potere
 * d'acquisto di oggi e `totalDeposited` e' la somma NOMINALE di tutti i
 * versamenti (capitale iniziale + 12·N contributi mensili). Il confronto
 * apples-to-oranges sotto-stimava sistematicamente il guadagno reale ogni
 * volta che era presente un PAC: un €100 versato in anno 10 viene contato a
 * potere d'acquisto piu' alto del suo reale valore di oggi (1/1.02^10 ≈ €82).
 *
 * Caso canonico: 10.000€ iniziali + 100€/mese, 2% rendimento, 2% inflazione,
 * 20 anni. Il rendimento reale (Fisher) e' esattamente 0%, quindi il
 * guadagno reale dovrebbe essere ~0€. Il calcolatore segnalava invece
 * −4.125€ di "perdita reale", scoraggiando un piano di accumulo che in
 * realta' preserva perfettamente il potere d'acquisto.
 *
 * Fix: ogni contributo viene deflazionato al tasso di inflazione per il
 * numero di mesi trascorsi dall'inizio, COSI' la sottrazione finale ha
 * entrambi i lati in euro di OGGI.
 *
 *     realTotalDeposited = initialCapital
 *                        + Σ_m  contributo / (1 + inflazione)^(m/12)
 *     realGain           = realFinalBalance - realTotalDeposited
 *
 * Inflazione zero: realTotalDeposited == nominalTotalDeposited (proprieta'
 * di sanity-check). Inflazione positiva: realTotalDeposited <
 * nominalTotalDeposited (i contributi futuri valgono meno di oggi).
 * Deflazione totale <= -100%: usiamo come fattore neutro 1 per evitare
 * divisioni per zero o per valori negativi (scenario degenere irrealistico).
 */
export function computeInflationAdjustedTotals(
    params: InflationAdjustedTotalsParams,
): InflationAdjustedTotalsResult {
    const initialCapital = Math.max(0, sanitizeFinite(params.initialCapital));
    const monthlyContribution = Math.max(0, sanitizeFinite(params.monthlyContribution));
    const inflationRatePct = sanitizeFinite(params.inflationRatePct);
    const years = Math.max(0, Math.floor(sanitizeFinite(params.years)));

    const totalMonths = years * 12;
    const monthlyInflationFactor = Math.pow(1 + inflationRatePct / 100, 1 / 12);

    let realTotalDeposited = initialCapital;
    let cumulativeInflationFactor = 1;

    for (let m = 1; m <= totalMonths; m++) {
        cumulativeInflationFactor *= monthlyInflationFactor;
        // Guard: deflazione totale <= -100% (cumulativeInflationFactor <= 0)
        // produrrebbe division-by-zero o segno errato. Trattiamo il contributo
        // come gia' in euro odierni in quel caso degenere.
        const safeFactor = cumulativeInflationFactor > 0 ? cumulativeInflationFactor : 1;
        realTotalDeposited += monthlyContribution / safeFactor;
    }

    return {
        realTotalDeposited,
        nominalTotalDeposited: initialCapital + monthlyContribution * totalMonths,
    };
}

export interface FinalBalanceDecompositionResult {
    /**
     * Saldo finale nominale prodotto dal solo capitale iniziale, capitalizzato
     * mensilmente per l'intero orizzonte:  initialCapital * (1 + m)^N.
     * Indipendente dai contributi mensili: e' la traiettoria che il lump sum
     * avrebbe avuto anche se non avessi versato un euro in piu'.
     */
    fromInitial: number;
    /**
     * Saldo finale nominale prodotto dai soli contributi mensili, ciascuno
     * capitalizzato dal mese del versamento alla fine dell'orizzonte. Forma
     * chiusa della rendita posticipata mensile:
     *     monthlyContribution * ((1+m)^N - 1) / m       (per m > 0)
     *     monthlyContribution * N                       (per m = 0)
     * Indipendente dal capitale iniziale: e' quanto produrrebbe il PAC se
     * partissi da zero.
     */
    fromContributions: number;
    /**
     * Quota del saldo finale imputabile al capitale iniziale, in [0, 1].
     * Coincide con `fromInitial / (fromInitial + fromContributions)` quando
     * la somma e' positiva; vale 0 negli scenari degeneri (entrambi a zero).
     */
    initialShare: number;
    /**
     * Quota del saldo finale imputabile ai contributi mensili, in [0, 1].
     * Complementare a `initialShare` (somma esatta a 1 quando la somma totale
     * e' positiva).
     */
    contributionsShare: number;
}

/**
 * Decompone il saldo finale nominale nelle DUE componenti additive che lo
 * generano: il capitale iniziale capitalizzato + i contributi mensili
 * capitalizzati. La ricorrenza `balance = balance * (1+m) + contribution` e'
 * lineare nelle due "sorgenti", quindi la decomposizione e' esatta:
 *
 *     finalBalance = initialCapital * (1+m)^N
 *                  + monthlyContribution * ((1+m)^N - 1) / m
 *
 * (Per m = 0 il secondo termine degenera a `monthlyContribution * N`.) E'
 * matematicamente identica al risultato di `simulateCompoundInterest` ma
 * espone la struttura finanziaria del piano: quanta parte del saldo viene
 * dal "punto di partenza" (lump sum + suo composto) e quanta dal "ritmo"
 * (contributi + loro composto). Risponde a una domanda concreta che le
 * altre KPI non coprono: "Sto costruendo il mio capitale soprattutto grazie
 * a quello che gia' avevo, o grazie a quello che continuo a versare?".
 *
 * Edge case `years <= 0`: tutto il saldo viene dall'iniziale (no PAC fatto).
 * Input non finiti: sanificati a 0 (coerente con `simulateCompoundInterest`).
 * Forma chiusa stabile numericamente: usiamo `expm1` per `(1+m)^N - 1` cosi'
 * da non perdere precisione su orizzonti corti / tassi piccoli.
 */
export function decomposeFinalBalance(
    params: CompoundInterestParams,
): FinalBalanceDecompositionResult {
    const initialCapital = Math.max(0, sanitizeFinite(params.initialCapital));
    const monthlyContribution = Math.max(0, sanitizeFinite(params.monthlyContribution));
    const annualRatePct = sanitizeFinite(params.annualRatePct);
    const years = Math.max(0, Math.floor(sanitizeFinite(params.years)));

    const totalMonths = years * 12;
    const monthlyRate = annualRatePct / 100 / 12;

    const compoundFactor = Math.pow(1 + monthlyRate, totalMonths);
    const fromInitial = initialCapital * compoundFactor;

    let fromContributions: number;
    if (totalMonths === 0) {
        fromContributions = 0;
    } else if (Math.abs(monthlyRate) < 1e-12) {
        // Degenerazione lineare: senza tasso ogni versamento contribuisce 1:1.
        fromContributions = monthlyContribution * totalMonths;
    } else {
        // expm1((N) * ln(1+m)) = (1+m)^N - 1, piu' stabile di sottrarre 1 a fattori grandi.
        const annuityNumerator = Math.expm1(totalMonths * Math.log1p(monthlyRate));
        fromContributions = (monthlyContribution * annuityNumerator) / monthlyRate;
    }

    if (!Number.isFinite(fromContributions) || fromContributions < 0) fromContributions = 0;

    const total = fromInitial + fromContributions;
    const initialShare = total > 0 ? fromInitial / total : 0;
    const contributionsShare = total > 0 ? fromContributions / total : 0;

    return {
        fromInitial,
        fromContributions,
        initialShare,
        contributionsShare,
    };
}
