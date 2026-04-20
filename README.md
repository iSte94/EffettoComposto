<div align="center">

# Effetto Composto

### La forza dell'interesse composto al servizio della tua indipendenza finanziaria

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/Licenza-CC_BY--NC_4.0-green?style=for-the-badge)](https://creativecommons.org/licenses/by-nc/4.0/)

**[effettocomposto.it](https://effettocomposto.it)**

**Versione corrente:** `v1.3.5`

---

*Simulatore mutuo, calcolatore FIRE, tracker patrimonio, carriera, stipendio netto, budget e molto altro.*
*Tutto in italiano. Tutto gratuito. Tutto open-source.*

</div>

---

## 📸 Scopri l'App in Azione

<div align="center">
  <img src="public/screenshots/dashboard-situazione.jpg" alt="Dashboard Situazione Generale" width="800" style="border-radius: 8px; margin-bottom: 20px;" />
  <br/>
  <img src="public/screenshots/dashboard-patrimonio.jpg" alt="Dashboard Patrimonio" width="800" style="border-radius: 8px; margin-bottom: 20px;" />
  <br/>
  <img src="public/screenshots/simulatore-fire.jpg" alt="Simulatore FIRE Monte Carlo" width="800" style="border-radius: 8px; margin-bottom: 20px;" />
  <br/>
  <img src="public/screenshots/simulatore-mutuo.jpg" alt="Simulatore Mutuo Immobiliare" width="800" style="border-radius: 8px; margin-bottom: 20px;" />
  <br/>
  <img src="public/screenshots/calcolo-stipendio-netto.jpg" alt="Calcolo Stipendio Netto" width="800" style="border-radius: 8px; margin-bottom: 20px;" />
  <br/>
  <img src="public/screenshots/mutui-market.jpg" alt="Mutui Market Confronto" width="800" style="border-radius: 8px; margin-bottom: 20px;" />
</div>

---

## Panoramica

**Effetto Composto** e' una webapp completa per la gestione della finanza personale, pensata per chi vuole raggiungere l'indipendenza finanziaria (FIRE). Unisce in un unico strumento tutto quello che serve per simulare, pianificare e monitorare il proprio percorso verso la liberta' finanziaria.

Installabile come app su smartphone (PWA), funziona anche offline e i calcoli pesanti girano su Web Worker per non bloccare l'interfaccia.

---

## Funzionalita'

### Simulazione e Calcolo

| Strumento | Descrizione |
|---|---|
| **Simulatore Mutuo** | Calcolo rata, ammortamento francese, confronto fino a 3 mutui side-by-side, analisi DTI (rata/reddito), analisi redditivita' acquisto vs affitto |
| **Calcolatore FIRE** | 10.000 simulazioni Monte Carlo via Web Worker, proiezione patrimonio, probabilita' di successo per anno target |
| **Interesse Composto** | Simulazione crescita capitale con versamenti periodici e reinvestimento |
| **Calcolatore Inflazione** | Impatto dell'inflazione sul potere d'acquisto nel tempo |
| **Calcolatore Finanziamento** | Rata di prestiti personali con ammortamento alla francese, anticipo, costo totale del credito e analisi DTI sul reddito |
| **Viewer Movimenti Directa** | Importa il CSV dei movimenti da Directa Trading: dashboard con KPI, grafici cumulativi, flussi mensili, breakdown per strumento, riepilogo annuale e tabella filtrata (solo visualizzazione, nessun dato salvato) |
| **Advisor Acquisti** | Analisi dell'impatto di un acquisto sul percorso FIRE con grafici comparativi |
| **Lordo -> Netto** | Calcolo dinamico stipendio netto con IRPEF, INPS, addizionali, bonus, cronologia scenari salvati e richiamo rapido delle simulazioni |

### Monitoraggio e Gestione

| Strumento | Descrizione |
|---|---|
| **Tracker Patrimonio** | Snapshot giornalieri del patrimonio netto, gestione immobili, liquidita' e titoli separati, portafoglio con dividendi, prestiti attivi, proiezione futura e storico esportabile |
| **Budget Mensile** | Spese per categoria, import CSV estratto conto (Fineco, Intesa, formato generico) |
| **Obiettivi di Risparmio** | Target personalizzati con tracking progressi e deadline |
| **Tracker Abbonamenti** | Costi ricorrenti con riepilogo mensile e annuale |
| **Strategia Debiti** | Confronto metodo snowball vs avalanche per l'estinzione dei debiti |
| **Carriera** | Timeline retributiva e strumenti per stimare l'evoluzione del reddito nel tempo dentro la stessa area del dashboard |

### Riepilogo e Alert

| Strumento | Descrizione |
|---|---|
| **Dashboard Riepilogo** | KPI principali, asset allocation, overview completa |
| **Alert Automatici** | Notifiche su rapporto DTI, fondo emergenza insufficiente, deviazioni dal percorso FIRE |
| **Export CSV** | Esportazione dati patrimonio e ammortamento in CSV (UTF-8 con BOM) |

---

## Tech Stack

```
Frontend       Next.js 16 (App Router) + React 19 + TypeScript
Styling        Tailwind CSS 4 + Shadcn/UI (tema new-york)
Database       Prisma ORM + SQLite
Grafici        Recharts
Animazioni     Framer Motion
Performance    Web Workers (Monte Carlo), React.memo, lazy loading
PWA            Service Worker (cache-first statico, network-first API)
Testing        Vitest + GitHub Actions CI
Deploy         Docker + Traefik (HTTPS automatico via Let's Encrypt)
```

---

## Versioning

- **Fonte di verita'** - il numero versione del software vive in `package.json` (`version`) ed e' la base sia del repo sia del frontend
- **Regola di release** - ogni deploy applicativo su VPS deve includere bump versione + nuova voce nel changelog con lo stesso numero
- **Bump rapido** - per i prossimi rilasci puoi usare `npm run release:patch`, `npm run release:minor` oppure `npm run release:major`
- **CI prima del deploy** - non deployare commit con badge GitHub rosso: il workflow `.github/workflows/ci.yml` deve restare in grado di fare `npm ci`, `prisma generate`, test e build, con `DATABASE_URL=file:./ci-test.db` disponibile gia' a livello job. In questo repo il controllo TypeScript affidabile di release e' quello eseguito dentro `next build`
- **UI discreta** - la versione corrente viene mostrata in piccolo sotto il brand nell'header, in grigio tenue, cosi' resta sempre verificabile senza sporcare la dashboard

---

## Changelog

### v1.3.5 - 20 aprile 2026 (bugfix finanziario — rata mutuo: NaN con tasso 0% e Infinity con durata 0)

- **Falla logica scovata** — nel Simulatore Mutuo (`src/components/mortgage-simulator/index.tsx`), nel Consulente Acquisti (`src/components/advisor-dashboard.tsx`) e nell'export del piano di ammortamento (`src/lib/export/csv.ts`) la rata mensile era calcolata inline con la formula francese diretta `R = P·i·(1+i)^n / ((1+i)^n − 1)`. Questa formula ha due singolarita' matematiche che NON erano protette: (1) con `tasso = 0%` il numeratore e il denominatore sono entrambi zero e il risultato e' `0/0 = NaN`; (2) con `durata = 0 anni` il denominatore e' zero e il numeratore e' positivo, il risultato e' `Infinity`. Il campo HTML del tasso aveva `min="0"`, quindi 0% era un input legittimo (prestiti familiari, promozioni auto a tasso zero): bastava digitarlo per vedere "€NaN" propagarsi in DTI, profittabilita', cashflow, costo opportunita' e confronto mutui in un colpo solo. La stessa formula, duplicata in 4 file, era andata fuori sincrono — solo il tab "Confronto" (`mortgage-comparison.tsx`) aveva i guard giusti
- **Soluzione applicata** — estratta la logica in un'unica funzione pura `calculateMortgagePayment` in `src/lib/finance/loans.ts`, con tre guard espliciti: (a) `annualRatePct = 0` ⇒ rata = `loanAmount / n` (ammortamento lineare, matematicamente corretto per un prestito a tasso zero); (b) `loanAmount = 0` o `numPayments = 0` ⇒ rata = 0 (no esplosione a Infinity); (c) input `NaN`, `Infinity` o negativi ⇒ normalizzati a 0 con `Number.isFinite` + `Math.max(0, …)`. Aggiunta anche `calculateMortgageRemainingDebt` per il debito residuo con gli stessi guard (chiusa della French amortization `D_k = P·((1+i)^n − (1+i)^k) / ((1+i)^n − 1)`). I 4 call-site (Simulatore Mutuo, Confronto offerte, Consulente Acquisti, export CSV) ora importano l'unica implementazione condivisa, eliminando la duplicazione e la possibilita' di divergenze future
- **Perche' l'app e' piu' robusta** — nessun utente puo' piu' far rendere "€NaN" o "€Infinity" alla dashboard semplicemente digitando un tasso legale sul campo input; la suite di test protegge i casi degeneri con 15 nuovi test di regressione in `loans.test.ts` che verificano valori di rata su un mutuo standard (160k @ 3.5% / 25a ≈ 800€/mese), il caso `tasso=0%` (1000€/mese lineari), `durata=0`, `loanAmount=0`, combinazioni di input invalidi (`NaN`, `Infinity`, negativi) e decrescenza monotona del debito residuo lungo il piano. Totale suite: 285/285 verdi (+15), `eslint` pulito

### v1.3.4 - 20 aprile 2026 (UX — nuova KPI "Tempo di Dimezzamento" nel Calcolatore Inflazione)

- **Problema iniziale** — il Calcolatore Inflazione (`src/components/inflation-calculator.tsx`) mostrava gia' potere d'acquisto finale, capitale equivalente futuro, valore nominale e reale dell'investimento, piu' una callout di erosione. Mancava pero' la domanda piu' intuitiva e didattica che gli utenti si pongono davanti a un'inflazione annuale ("a quel ritmo, fra quanti anni i miei soldi varranno la meta'?"): per saperlo bisognava mentalmente applicare la Regola del 72 sulla % inserita, operazione che il calcolatore dovrebbe fare al posto dell'utente
- **Cosa e' stato modificato** — (1) nuovo campo `purchasingPowerHalvingYears: number | null` nel risultato di `projectInflation` (`src/lib/finance/inflation.ts`), calcolato con la formula esatta `ln(2) / ln(1 + i)` invece della Regola del 72 approssimata (tolleranza: a 7% la Regola del 72 restituisce 10.29 anni, la formula esatta 10.245 → differenza inferiore all'1% ma coerente col resto del codice finanziario gia' basato su formule esatte come Fisher). (2) Restituisce `null` per inflazione ≤ 0, in modo che il caso "deflazione o tasso zero" non generi un numero fuorviante (il potere d'acquisto in quei casi non si dimezza mai). (3) Nuova card UI compatta con icona `Hourglass` che mostra il valore formattato come intero sopra i 10 anni ("35 anni") o con una cifra decimale sotto ("7.3 anni") per distinguere inflazioni alte. La card e' affiancata alla callout di erosione esistente in un grid 3+2, ha colori rose/tonalita' critiche coerenti con il tema "inflazione = erosione", e un `title` HTML descrittivo per l'accessibilita'
- **Perche' migliora l'esperienza utente** — trasforma una percentuale astratta in un orizzonte temporale tangibile: "inflazione al 5%" diventa "il tuo potere d'acquisto si dimezza in 14 anni", rendendo molto piu' viscerale l'urgenza di investire invece di tenere liquidita'. E' una metrica finanziaria nota (half-life del potere d'acquisto) ampiamente usata nella divulgazione economica, e completa il trittico narrativo gia' presente nel calcolatore (quanto perdi / quanto ti serve / quanto tempo impiega a dimezzarsi)
- **Manutenibilita'** — aggiunti 6 test di regressione in `inflation.test.ts` che verificano valori noti (2% → ~35 anni, 7% → ~10 anni), coerenza con il modello (`(1+i)^halving = 2`), gestione di inflazione zero e deflazione (`null`), e indipendenza da `amount` e `years`. La nuova metrica e' pura funzione dell'inflazione, quindi il calcolo e' O(1) e non appesantisce il `useMemo` esistente. Suite completa: 270/270 verdi (+6), `eslint` pulito

### v1.3.3 - 20 aprile 2026 (UX — KPI header piu' leggibili su mobile con delta compatto)

- **Problema iniziale** — la barra KPI in testa all'app (`src/components/header-kpis.tsx`) mostrava sia il patrimonio netto sia la variazione vs snapshot precedente con `formatEuro` completo (es. `€1.234.567` + `+€125.000`). Su mobile questo produceva bottoni molto larghi che andavano facilmente a capo e competevano visivamente con il valore principale; inoltre la direzione del trend usava `netWorthChange >= 0`, quindi anche una variazione nulla mostrava freccia verde verso l'alto, visivamente fuorviante
- **Cosa e' stato modificato** — (1) nuova utility `formatEuroCompact(value)` in `src/lib/format.ts` che usa formato K/M sopra i 10.000 € (es. `€125K`, `€1.2M`) mantenendo la forma completa per importi minori per non perdere precisione sui centesimi. Include gestione segno, `NaN`/`Infinity` → em-dash e strip dello zero decimale finale. (2) `HeaderKpisBar` applica il compact solo al delta secondario (il patrimonio principale resta in formato completo per massima leggibilita'), introduce uno stato `flat` con icona `Minus` grigia e etichetta neutra quando la variazione e' tra -0.5 e +0.5 € (rumore di arrotondamento), e sposta il dato completo nel `title` HTML cosi' l'utente puo' comunque leggere il valore preciso in hover
- **Perche' migliora l'esperienza utente** — su mobile la barra KPI smette di andare a capo per portafogli a 6-7 cifre, l'occhio coglie subito il valore principale senza essere distratto da un delta molto lungo, e il caso di variazione nulla non viene piu' falsamente colorato di verde con freccia up. L'accessibilita' aumenta grazie al titolo descrittivo sul bottone che include sia patrimonio sia variazione nel formato esteso
- **Manutenibilita'** — `formatEuroCompact` e' riutilizzabile negli altri 57 file che importano `formatEuro` ogni volta che serve una rappresentazione sintetica (es. tooltip grafici, card KPI affollate). Aggiunti 6 test unitari dedicati in `src/lib/format.test.ts` che coprono soglie K/M, segno negativo, strip dello zero decimale e valori non finiti. Suite completa `vitest`: 264/264 verdi; `eslint` pulito

### v1.3.2 - 20 aprile 2026 (migration di produzione per il workspace Consulente)

- **Migration Prisma mancante aggiunta correttamente al repo** - la release `v1.3.0` aveva introdotto i campi `advisorSavedScenarios` e `advisorReminders` nel modello `Preference`, ma senza una migration versionata corrispondente. In locale il problema era rimasto nascosto perche' il database di sviluppo era stato aggiornato con `prisma db push`, mentre in produzione `prisma migrate deploy` non aveva nulla da applicare
- **Fix strutturale del processo di deploy** - aggiunta la migration `20260420003500_add_advisor_workspace_preference_fields` che allinea finalmente schema Prisma e database reale in produzione con due `ALTER TABLE` espliciti. In questo modo i deploy futuri non dipendono piu' da stato locale implicito o da DB gia' “sporchi” di sviluppo
- **Impatto diretto sul bug utente** - senza queste colonne, il runtime server-side poteva fallire leggendo `Preference` e il refresh snapshot notturno andava in errore con `P2022` (`The column main.Preference.advisorSavedScenarios does not exist`). La migration elimina questa classe di mismatch e rende coerenti login, preferenze, scheduler e workspace Advisor sul DB live
- **Allineamento release** - bump versione a `v1.3.2` per tenere tracciato anche il fix infrastrutturale del database, oltre all'hotfix cache/sessione della `v1.3.1`

### v1.3.1 - 20 aprile 2026 (hotfix cache/sessione per dati utente e cashflow)

- **Fix robusto per dati utente stale o incoerenti dopo login/release** - le route autenticate piu' sensibili (`/api/auth/me`, `/api/preferences`, `/api/patrimonio`) ora rispondono con header `Cache-Control: private, no-store` e `Vary: Cookie`, impedendo al browser o a layer intermedi di riutilizzare risposte utente vecchie per sessioni diverse
- **Service Worker corretto per non cacheare piu' API utente** - `public/sw.js` e' stato aggiornato a `fi-cache-v4` e ora bypassa completamente tutte le richieste `/api/*`. Questo elimina la possibilita' che preferenze, storico patrimonio o stato sessione vengano riletti da cache obsolete dopo deploy, refresh o problemi di rete, che era il candidato principale dietro il ritorno di etichette come `Persona 1 / Persona 2` e cashflow incompleto
- **Fetch client critiche forzate `no-store`** - `AuthContext`, `usePreferences`, `Patrimonio`, `FIRE`, `Riepilogo`, header KPI e `Advisor` ora richiedono i dati account-specific sempre con `cache: "no-store"` e `credentials: "same-origin"`, cosi' i nomi reali delle persone, le spese e lo storico vengono letti dal backend live invece che da un eventuale cache locale stantia
- **Error handling piu' trasparente** - nelle dashboard principali il fallimento del caricamento dati non resta piu' silenzioso dietro fallback fuorvianti: vengono loggati errori piu' precisi e l'utente riceve un feedback esplicito se i dati del proprio account non risultano caricabili
- **Dati di `stefano` verificati integri sul DB live** - durante l'analisi del bug e' stato confermato che l'account `stefano` mantiene ancora preferenze corrette (`Stefano`, `Simona`), `expensesList`, prestiti e `13` snapshot patrimonio; il problema era quindi di lettura/cache/sessione e non di perdita database
- **Verifica release** - hotfix validato con `eslint`, `vitest` e `next build` tutti verdi prima del deploy
### v1.3.0 - 19 aprile 2026 (Consulente acquisti come workspace decisionale)

- **Consulente acquisti separato dai dati reali** - il vecchio flusso `Accetta Spesa` e' stato rimosso: una simulazione non aggiorna piu' automaticamente patrimonio, rate reali o dashboard FIRE/Overview. Il tab Consulente torna a essere uno spazio decisionale, non un punto di registrazione contabile
- **Nuovo workspace decisionale nel Consulente** - aggiunta un'area persistente dedicata con CTA chiare e gerarchia visiva piu' forte: `Salva scenario`, `Crea piano di acquisto`, `Rivedi piu avanti`, `Confronta con alternative` ed `Esporta sintesi`. Ogni scenario salva nome, prezzo, esborso/rata, score, TCO, impatto FIRE, data e nota operativa, cosi' l'utente puo' costruire una memoria delle decisioni senza sporcare il resto dell'app
- **Shortlist e promemoria intelligenti** - il Consulente ora permette di marcare scenari come shortlist e di creare promemoria sia a data fissa sia condizionati al ritorno sopra una soglia di fondo emergenza. L'utente puo' quindi dire "rivaluta tra 3 mesi" oppure "rivedi quando torno sopra 6 mesi di cuscinetto" direttamente dal risultato della simulazione
- **Piano di acquisto collegato agli Obiettivi di Risparmio** - l'azione `Crea piano di acquisto` genera un vero `SavingsGoal` con target, deadline e categoria coerenti allo scenario (es. anticipo per acquisto finanziato), trasformando il consulente da strumento di analisi a strumento di execution planning senza introdurre side effect patrimoniali
- **Nuova API backend dedicata al workspace Advisor** - introdotta `src/app/api/advisor-workspace/route.ts` con validazioni strutturate e persistenza dedicata in `Preference` tramite i nuovi campi `advisorSavedScenarios` e `advisorReminders`. La release mantiene anche compatibilita' legacy: eventuali `acceptedPurchases` storici vengono letti solo come fallback dentro il nuovo workspace, senza piu' impattare FIRE e Overview
- **Pulizia inter-tab e coerenza dei numeri** - rimossi i box "Acquisti Accettati" da FIRE e Riepilogo, cosi' i numeri mostrati fuori dal Consulente tornano a rappresentare solo dati realmente registrati dall'utente. A supporto del refactor sono stati aggiunti test unitari dedicati per scenario fingerprinting, import legacy, goal draft e report export; release verificata con `prisma db push`, `eslint`, `vitest` e `next build`

### v1.2.3 - 19 aprile 2026 (UX — skeleton loader Obiettivi di Risparmio)

- **Stato di caricamento migliorato nel tab "Obiettivi di Risparmio"** (`src/components/savings-goals.tsx`) — durante il fetch iniziale dei goal da API, il componente mostrava un semplice testo statico "Caricamento..." su sfondo tratteggiato; sostituito con un componente `SavingsGoalsSkeleton` dedicato che riproduce fedelmente la struttura reale della UI: card di riepilogo con barra di progresso e 3 mini-metriche, seguite da 3 card-goal con placeholder per icona categoria, nome, badge, importi e barra di avanzamento individuale
- **Coerenza visiva** — il pattern skeleton è già presente in `overview-dashboard.tsx` (importa `Skeleton` da `@/components/ui/skeleton`); estenderlo agli obiettivi elimina l'incoerenza tra i tab e dà una percezione di velocità più elevata, riducendo il layout shift al completamento del fetch
- **Impatto zero su logica** — nessuna modifica alle API call, agli hook o ai calcoli; la funzione `SavingsGoalsSkeleton` è definita a livello di modulo (non inline dentro il componente) per evitare ricreazioni ad ogni render

### v1.2.2 - 19 aprile 2026 (fix finanziario: cliff di €65 nelle detrazioni IRPEF al confine 28k)

- **Bug nel calcolo delle detrazioni lavoro dipendente (`src/lib/finance/irpef.ts` → `calculateNetSalary`)** — il terzo scaglione di `detrazioniLavoro` (28.001–50.000€ di imponibile) usava il coefficiente base `1910` come punto di partenza: `detrazioniLavoro = 1910 × (50.000 − imponibile) / 22.000`. Tuttavia il secondo scaglione (15.001–28.000€) include una correzione `+65` aggiornata alle direttive 2025/2026 e termina a **1975** (= 1910 + 65) sull'imponibile di esattamente 28.000€. La discrepanza tra i due scaglioni produceva un salto brusco di **€65** nelle detrazioni appena sopra la soglia: guadagnare un euro in più a 28.001€ aumentava l'IRPEF netta di €65, riducendo il reddito netto di circa **€64**
- **Conseguenza concreta** — il simulatore stipendi mostrava uno stipendio netto artificialmente gonfiato per redditi appena sotto 28.000€ e un brusco crollo appena sopra; le proiezioni FIRE e la pianificazione di risparmio erano falsate per chiunque si trovasse nella fascia 28.000–50.000€ di imponibile
- **Formula corretta** — allineato il coefficiente del terzo scaglione da `1910` a `1975` (= 1910 + 65), in modo che la curva delle detrazioni sia continua al confine 28k: `detrazioniLavoro = 1975 × (50.000 − imponibile) / 22.000`. A 28.000€ il valore è ancora 1975 (invariato rispetto al secondo scaglione), a 50.000€ si azzera correttamente a 0; i contribuenti nella fascia 28k–50k ricevono detrazioni leggermente superiori (max +€65 a 28.001€, proporzionale a zero verso 50.000€)
- **Test di regressione** — aggiunto test automatico `REGRESSION: nessun cliff di detrazioni al confine 28k` che verifica con due RAL ravvicinati (imponibile uno sotto e uno sopra 28.000€) che il reddito netto sia monotonicamente crescente, prevenendo il re-inserimento del cliff in future modifiche ai coefficienti IRPEF

### v1.2.1 - 19 aprile 2026 (performance: eliminato JSON.parse ridondante nel hot path FIRE)

- **Hot path simulazione FIRE ottimizzato** — la funzione `getActiveRealEstatePassiveIncomeAtMonth` chiamava `JSON.parse(realEstateListStr)` a ogni invocazione: nella simulazione deterministica (1.201 iterazioni × 2 chiamate) e nel pre-computo Monte Carlo (~800 chiamate) questo produceva oltre **2.400 parse ridondanti per ogni run**, su una stringa identica per tutta la durata della simulazione. La lista immobili e' ora memorizzata con `useMemo` e aggiornata solo quando cambia `realEstateListStr`, eliminando il parsing ripetuto e rendendo l'intera simulazione piu' veloce
- **Tipo `any` rimosso** — il parametro `prop` nel `reduce` era annotato `any` con eslint-disable; ora usa correttamente `RealEstateProperty` (gia' importato), migliorando la type safety e rimuovendo il commento di soppressione
- **Dead state rimosso** — lo state `const [, setLoading]` era impostato ma il valore non veniva mai letto (la schermata di caricamento e' gestita da `isLoadingUser`): rimossi i tre statement `useState`, `setLoading(true)` e `setLoading(false)` inutili che causavano un re-render aggiuntivo inutile all'avvio del fetch

### v1.2.0 - 19 aprile 2026 (AI Telegram piu' robusto + Consulente acquisti/FIRE ridisegnato)

- **Telegram piu' affidabile e leggibile lato utente** - il bot ora renderizza una porzione molto piu' ampia del Markdown in HTML compatibile con Telegram (`bold`, `inline code`, link, heading e code block), spezza i messaggi senza superare i limiti effettivi dopo il rendering HTML, evita per quanto possibile di rompere i blocchi di codice a meta' e mantiene la tastiera inline solo sull'ultimo chunk. Se Telegram rifiuta il payload HTML per errori di parsing delle entity, il send torna automaticamente in plain text invece di perdere la risposta
- **Error handling Telegram/AI meno rumoroso e piu' onesto** - gli errori transienti di Gemini/OpenRouter (429/5xx, overload, internal error, timeout transitori) vengono riconosciuti come temporanei: l'utente riceve un messaggio chiaro e non allarmistico, mentre il webhook non persiste un `lastError` fuorviante. Restano invece visibili e persistiti gli errori realmente correggibili dall'utente, come formati comando invalidi o allegati non validi
- **Provider Gemini con retry automatico sui transitori** - il bridge server-side verso Gemini ritenta fino a 3 volte sui 429 e 5xx con backoff leggero, riducendo i falsi fallimenti durante i picchi del provider senza cambiare l'interfaccia del runtime AI
- **Prompt AI specializzato per Telegram** - il system prompt ora differenzia chiaramente il canale web da quello Telegram: su mobile l'assistente deve usare risposte piu' compatte, niente tabelle Markdown superflue, e per le domande FIRE tipo "a che punto sono?" viene istruito a partire da `simulate_fire_scenario` e a restituire sempre un mini-quadro numerico ordinato e leggibile
- **Flusso `/spesa` piu' robusto** - quando l'utente arma `/spesa` con una nota testuale e invia il file in un messaggio successivo, la nota viene mantenuta e reiniettata nel prompt del turno AI invece di andare persa. In piu' `/ricategorizza` valida davvero il mese in formato `YYYY-MM` con mesi `01-12`, evitando input tipo `2026-13`
- **Consulente acquisti molto piu' leggibile** - il pannello risultati del tab Advisor e' stato riorganizzato attorno a una lettura guidata: verdetto in testa, KPI chiave subito visibili, sintesi separata da criticita' e approfondimenti, e metriche anonime meno fuorvianti per chi non e' loggato. Le analisi avanzate sono state spostate in tab dedicate (`Decisione`, `FIRE`, `Formule`, `Costo`) per evitare il muro di informazioni tutto in una volta
- **Blocco "Impatto sul tuo FIRE" completamente ridisegnato** - la parte piu' importante del consulente acquisti e' diventata una vera decision card: hero visuale con ritardo FIRE in evidenza, confronto `Senza acquisto` vs `Con acquisto`, driver del ritardo (target, capitale tolto oggi, freno mensile), grafico molto piu' forte con tema dark dedicato, tooltip custom, marker sui punti di arrivo FIRE e fascia evidenziata che mostra il tempo perso tra i due scenari. L'obiettivo non e' solo "mostrare il grafico", ma far capire a colpo d'occhio quanto tempo di liberta' costa davvero l'acquisto
- **Copertura test estesa sulle regressioni di canale** - aggiunti test dedicati per il rendering Telegram, il fallback da HTML a plain text, la persistenza della nota `/spesa`, la validazione di `/ricategorizza`, gli errori transienti Gemini nel webhook, le istruzioni canale-specifiche del prompt AI e il retry automatico del provider Gemini. Release verificata anche con `eslint` e `next build`

### v1.1.4 - 19 aprile 2026 (fix finanziario critico: rimborso IRPEF pensione calcolato sulla base imponibile errata)

- **Bug nel motore Pension Optimizer (`src/lib/finance/pension-optimizer.ts` → `computePersonBreakdown`)** — il calcolo del risparmio fiscale annuo derivante dalla deduzione pensionistica usava il RAL grezzo come base imponibile IRPEF: `calculateIrpef(grossAnnualSalary) - calculateIrpef(grossAnnualSalary, deductibleAmount)`. La funzione `calculateIrpef` si aspetta pero' un reddito gia' depurato dei contributi INPS, non il lordo annuo: passarle il RAL diretto spostava artificialmente il reddito in uno scaglione IRPEF superiore. Per un RAL di 28.500-33.000€ (fascia molto comune) il codice applicava l'aliquota marginale del 33% invece del corretto 23%, gonfiando il rimborso fiscale stimato fino al 43% (es. 280€ invece di 230€ per 1.000€ di versamento, +166€/anno su 1.200€)
- **Formula corretta** — introdotto `DEFAULT_INPS_RATE = 0.0919` (aliquota media lavoratori dipendenti settore privato, aziende > 15 dipendenti) e ricalcolata la base imponibile come `imponibileIrpef = RAL × (1 − 0.0919)` prima di invocare `calculateIrpef`. L'approssimazione con aliquota fissa introduce uno scarto < 1% rispetto alla singola aliquota contrattuale specifica (range 5.84–9.49%), trascurabile rispetto all'errore precedente che spostava il reddito nello scaglione sbagliato
- **2 nuovi test di regressione** in `pension-optimizer.test.ts`: (1) RAL 28.500€ + 1.000€ di contributo → rimborso atteso 230€ al 23% puro (non 280€ al 33% come prima), (2) RAL 30.000€ + 1.200€ → rimborso 276€ al 23% (non 396€). Tutti i test esistenti aggiornati con helper `expectedTaxRefund(ral, deductible)` che rispecchia la formula corretta
- **Impatto finanziario** — il fix elimina la sovrastima del risparmio fiscale pensionistico per i contribuenti con RAL tra 28.000€ e 33.000€, fascia in cui la differenza 23%/33% genera l'errore massimo. La proiezione FIRE ora incorpora un beneficio fiscale reale invece di uno gonfiato, migliorando l'accuratezza della simulazione a lungo termine

### v1.1.3 - 18 aprile 2026 (UX — "Guadagno Reale" nel calcolatore Interesse Composto)

- **Nuova KPI "Guadagno Reale" nel calcolatore Interesse Composto** — aggiunta una card dedicata che mostra la crescita effettiva del potere d'acquisto (`realFinalBalance - totalDeposited`), ovvero di quanto l'utente si e' davvero arricchito in termini reali rispetto a quanto ha versato. Il valore viene colorato in verde se positivo (capitale cresciuto al netto dell'inflazione) o in rosso se negativo (rendimento non sufficiente a compensare l'erosione inflattiva), con icona `TrendingUp`/`TrendingDown` coerente e sottotitolo che ricorda il totale versato di confronto. Include un `InfoTooltip` didattico che spiega il significato finanziario del dato
- **Perche' migliora l'esperienza** — il simulatore mostrava gia' "Valore Reale" (saldo finale deflazionato) e "Totale Versato", ma l'utente doveva fare mentalmente la sottrazione per capire se i suoi soldi avevano davvero lavorato. In scenari realistici (rendimento basso + inflazione alta + orizzonte breve) il valore reale puo' risultare inferiore ai contributi, cioe' la strategia ha *perso* potere d'acquisto: renderlo esplicito come singolo numero colorato trasforma il calcolatore in uno strumento che smaschera l'illusione dei rendimenti nominali gonfiati, completando il trittico "Valore Reale / Punto di Svolta / Guadagno Reale" senza introdurre nuove API o parametri utente
- **Zero regressioni** — il calcolo vive nello stesso `useMemo` gia' esistente (nessuna nuova dipendenza), lint pulito e suite di 228 test unitari confermata verde

### v1.1.2 - 18 aprile 2026 (fix finanziario critico: PAC trimestrali/semestrali saltati silenziosamente)

- **Bug di scheduling nel motore PAC (`src/lib/pac.ts` → `matchesPeriodicMonth`)** — la funzione che decide se una cadenza trimestrale o semestrale e' dovuta nel giorno corrente usava `offset = currentMonth - anchorMonth` e richiedeva `offset >= 0`. Conseguenza: ogni mese precedente all'anchor nello stesso anno solare veniva scartato, interrompendo le esecuzioni tra dicembre e l'anchor dell'anno successivo. Esempio concreto e pericoloso: un PAC **trimestrale con anchor Novembre** sarebbe dovuto scattare a Nov/Feb/Mag/Ago — invece il codice lo eseguiva solo in Novembre, saltando silenziosamente **3 esecuzioni su 4 ogni anno** (il 75% dei versamenti). Analogamente, un PAC semestrale con anchor Agosto non scattava mai a Febbraio. Lo scheduler gira giornalmente (`applyDuePacSchedules` in `src/lib/pac-executor.ts`) e non lascia alcuna traccia quando `isPacScheduleDue` risponde `false`: il bug era dunque invisibile sia in UI che nel DB, erodendo nel tempo il piano di accumulo dell'utente
- **Formula corretta** — sostituito il confronto lineare con un **modulo ciclico positivo** (`offset = ((diff % intervalMonths) + intervalMonths) % intervalMonths`), che riconosce correttamente le cadenze indipendentemente dall'anno solare. Aggiunti inoltre **guardrail difensivi** che scartano `anchorMonth` fuori range (0, 13, NaN) e `intervalMonths <= 0`, evitando che un record DB corrotto faccia partire esecuzioni casuali
- **3 nuovi test di regressione** in `pac.test.ts`: (1) cadenza trimestrale con anchor Novembre verifica Nov + Feb/Mag/Ago dell'anno successivo, (2) cadenza semestrale con anchor Agosto verifica Ago + Feb, (3) `anchorMonth` fuori range (0, 13) non attiva mai la schedule. Suite totale: **228 test passati**
- **Impatto finanziario** — il fix elimina la perdita silenziosa di versamenti PAC per tutti gli utenti che hanno configurato una cadenza trimestrale o semestrale con anchor nella seconda meta' dell'anno. Recupera fino al 75% delle esecuzioni mancate su piani quarterly con anchor Nov/Dic e il 50% su semestrali con anchor Jul-Dec, rendendo il motore di accumulo matematicamente corretto e conforme all'aspettativa esplicita della UI ("ogni 3 mesi a partire da…")

### v1.1.1 - 18 aprile 2026 (UX — alert tasso di risparmio nel Riepilogo)

- **Nuovo alert "Tasso di risparmio"** nel pannello `FinancialAlerts` del tab Riepilogo: sfrutta il `netIncome` gia' calcolato in Patrimonio (risparmio mensile al netto di spese, mutuo, affitti e subscription) e lo rapporta al reddito lordo familiare per esporre tre scenari concreti — cashflow negativo (danger), tasso di risparmio < 10% (warning) e tasso >= 50% da FIRE (success). Prima del cambio, l'utente vedeva solo il numero `netIncome` nella card "Risparmio Netto" senza un riferimento percentuale ne' un feedback qualitativo: ora il Riepilogo segnala esplicitamente quando il flusso di cassa sta erodendo il patrimonio, quando il risparmio e' troppo esile per costruire capitale, e quando si e' gia' a un ritmo da indipendenza finanziaria
- **Formattazione valutaria coerente** negli alert su obiettivi di risparmio: sostituito `€${x.toLocaleString('it-IT')}` con `formatEuro()` da `@/lib/format`, cosi' i messaggi rispettano la stessa regola (simbolo unicode, zero decimali, separatore italiano) usata ovunque nell'app e restano allineati se il formatter cambiera' in futuro
- **Perche' migliora l'esperienza** — il tasso di risparmio e' il KPI piu' predittivo del tempo di raggiungimento del FIRE, ma finora l'app lo mostrava solo come valore assoluto in euro. Renderlo percentuale con soglie chiare trasforma un dato osservativo in un nudge comportamentale, senza introdurre API esterne, senza nuovi componenti e senza toccare il flusso dati esistente (il valore `monthlySavings` era gia' disponibile in `overview-dashboard`, viene semplicemente passato al componente alert)
- **Zero regressioni** — suite di 211 test unitari verde, lint pulito, nessun cambio ai tipi condivisi o allo schema Prisma

### v1.1.0 - 18 aprile 2026 (import spese Telegram completo + Coast FIRE piu' realistico)

- **Import spese Telegram davvero operativo end-to-end** - il bot personale ora gestisce il flusso `/spesa` con screenshot singoli, PDF e album multi-immagine (`media_group_id`) nello stesso thread AI, mantenendo il ciclo corretto "capisco -> ti mostro -> tu correggi -> confermi -> salvo". Gli allegati vengono scaricati da Telegram, passati direttamente al provider multimodale e trasformati in un batch di transazioni da confermare, senza fallback OCR e senza scritture silenziose sul database
- **Batch import budget revisionabile prima del salvataggio** - aggiunti tool server-side per leggere il batch pending, correggerlo in linguaggio naturale prima della conferma, salvare regole merchant permanenti e rimuoverle. L'assistente puo' quindi modificare importi, categorie, date, righe da ignorare e note dopo un feedback discorsivo dell'utente, invece di costringere a rifare tutto da capo
- **Deduplica, audit e apprendimento merchant** - le transazioni budget ora memorizzano `merchantNormalized`, `movementType`, `importConfidence` e `importBatchId`; sono stati introdotti `BudgetImportBatch` e `BudgetMerchantRule` per tenere audit degli import, rollback dell'ultimo batch, regole "merchant -> categoria" o "ignora sempre" e deduplica piu' robusta su descrizioni bancarie sporche, date vicine e importi uguali
- **Nuovi comandi Telegram per il budget** - oltre a `/spesa`, il bot supporta `/ultimespese`, `/annullaultimoimport`, `/categorie` e `/ricategorizza`, cosi' l'utente puo' consultare gli ultimi movimenti, annullare l'ultimo import Telegram, vedere categorie/regole apprese e riapplicare le regole automatiche direttamente dalla chat
- **Backup/export budget portati a v3** - l'export/import dati utente include ora anche batch di import budget e regole merchant, mantenendo la storia degli import AI e la logica di categorizzazione tra device, backup e restore. La serializzazione resta compatibile con i dati esistenti ma aggiunge il nuovo livello audit
- **Coast FIRE piu' fedele alla vita reale** - il motore FIRE ora riconosce le rendite immobiliari che partono prima del retirement, permette di decidere quanta rendita pre-FIRE reinvestire (percentuale o quota fissa), propaga questa scelta nella simulazione Monte Carlo e nel Coast FIRE target, e rende piu' trasparente la UI con varianti prudenziali, breakdown delle rendite e copy piu' accurata sul significato del Coast FIRE
- **Rendite immobiliari future trattate meglio** - gli stream immobiliari mantengono la loro vera eta' di partenza invece di essere forzati al retirement, cosi' una casa che inizia a rendere a 42 anni pesa davvero nel percorso FIRE e non solo nel giorno del ritiro. I test di regressione coprono ora sia la partenza anticipata sia l'effetto della quota reinvestita sul Coast FIRE
- **Calcolatore finanziamento con DTI piu' leggibile** - il tool prestiti mostra ora una barra DTI molto piu' chiara, con zone comfort/attenzione/critica, marker 33% e 40%, indicatore visivo sulla soglia e badge coerenti con il livello di rischio. L'obiettivo e' trasformare il DTI da numero secco a segnale leggibile anche a colpo d'occhio
- **GitHub Actions riportata su binari puliti** - la CI non deve piu' andare in rosso per motivi cosmeticamente brutti ma evitabili: il workflow ora riceve `DATABASE_URL` a livello job anche per `prisma generate`, i test provider importano esplicitamente `describe/it/expect` da Vitest, il lockfile include anche i peer `@emnapi/*` richiesti dai pacchetti WASI opzionali su Linux, e il gate TypeScript di release passa dal `next build` reale invece di un `tsc --noEmit` standalone che in questo setup segnalava falsi positivi. Risultato: niente badge rosso su push validi e controllo allineato al deploy effettivo
- **Qualita' di release verificata** - confermati verdi `eslint`, `vitest`, `next build`, sync Prisma locale e runtime Prisma rigenerato correttamente anche su Windows dopo il lock del DLL
### v1.0.1 - 18 aprile 2026 (fix finanziario critico: `projectFire` ignorava l'esborso immediato nel flag `alreadyFire`)

- **Bug critico nel motore FIRE deterministico (`src/lib/finance/fire-projection.ts`)** — il flag `alreadyFire` e il conseguente azzeramento di `monthsToFire`/`yearsToFire` erano calcolati con `startingCapital >= fireTarget`, ignorando completamente `oneTimeOutflow`. Quando un utente gia' FIRE simulava un acquisto che lo portava SOTTO la soglia (es. patrimonio 2M, casa 1.7M, target 600k → capitale effettivo 300k), il loop individuava correttamente i mesi necessari per tornare a FIRE ma poi li sovrascriveva a 0, dando all'Advisor la falsa certezza che "l'acquisto non ritarda il FIRE". Conseguenza: `fireDelayMonths(baseline, withPurchase)` ritornava 0 anche per esborsi molto significativi, silenziando il principale indicatore comparativo dell'Advisor
- **Formula corretta** — introdotta la variabile derivata `initialCapital = max(0, startingCapital - oneTimeOutflow)` usata sia come punto di partenza della proiezione sia come criterio per `alreadyFire`. Il punto 0 del `chartData` riflette ora il capitale reale disponibile dopo l'esborso, e il flag indica correttamente se il piano e' gia' FIRE *dopo* l'acquisto
- **4 nuovi test di regressione** in `fire-projection.test.ts`: (1) esborso che porta sotto il target NON deve lasciare `alreadyFire=true`, (2) `fireDelayMonths` rileva il ritardo quando il baseline e' gia' FIRE, (3) esborso che non scende sotto il target mantiene `alreadyFire=true`, (4) esborso >= capitale iniziale non produce capitale negativo. Suite totale: **215 test passati**
- **Impatto** — il fix rende finanziariamente affidabile il confronto "con vs senza acquisto" per tutti gli utenti con patrimonio superiore al target FIRE, che rappresentano il segmento piu' esposto a decisioni di spesa ad alto impatto (prima casa, investimenti immobiliari, passaggi generazionali)

### v1.0.0 - 18 aprile 2026 (AI unificata server-side + bot Telegram personale)

- **Release 1.0 ufficiale** - Effetto Composto entra nella fase `1.0.0` con un'architettura AI stabile e pronta per l'uso reale: il motore conversazionale non vive piu' nel browser ma in un runtime server-side unico, riusato dalla tab AI web, dall'analisi performance e dal nuovo canale Telegram
- **Nuovo runtime AI server-side unificato** - introdotti un contesto utente derivato privacy-first, prompt builder centrale, registry tool lato server e persistenza completa di thread, messaggi, allegati e memoria. Il browser non chiama piu' direttamente Gemini/OpenRouter per la chat principale: provider, modello e chiave vengono salvati sul server in forma cifrata e riusati in tutti i canali
- **Bot Telegram personale per ogni utente** - ogni account puo' configurare il proprio token BotFather, registrare automaticamente il webhook e collegarsi tramite deep link `/start <codice>`. Il bot gira sullo stesso modello della tab AI, vede gli stessi dati utente e supporta `/help`, `/new`, `/status`, `/unlink`, piu' dialogo libero in linguaggio naturale
- **AI consulente + calcolatore professionista** - Telegram e web condividono tutti i tool analitici principali della piattaforma: lettura patrimonio, budget, obiettivi, dividendi, preferenze e simulazioni di scenario. Aggiunti anche tool ad alto livello per simulazione mutuo e simulazione FIRE con override testuali, cosi' il bot puo' rispondere a domande tipo "se compro casa a 300k con mutuo 20 anni?" usando i dati reali del profilo
- **Azioni scrivibili con conferma esplicita** - introdotto il lifecycle `AssistantPendingAction`: l'AI puo' preparare operazioni su budget, obiettivi e memoria, ma ogni scrittura resta in stato pending finche' l'utente non conferma da web o da Telegram. Questo evita side effect silenziosi e rende il bot davvero utilizzabile su dati personali sensibili
- **Cronologia unica multi-canale** - i thread AI ora hanno metadato `channel` (`web` o `telegram`), badge dedicato nella sidebar e persistenza unificata. Una conversazione Telegram non e' piu' separata dal resto dell'assistente: entra nello stesso storico dell'utente con i messaggi e gli eventuali esiti delle conferme
- **Secret ripuliti dai payload client/LLM** - `aiApiKeyEnc`, token Telegram e webhook secret non compaiono piu' nelle API browser e non entrano nel contesto inviato al modello. Le preferenze esposte al frontend vengono sanificate, e l'export utente AI usa un bundle derivato controllato
- **Analisi performance migrata sul backend** - anche il dialog "Analizza con AI" del tab performance usa ora il motore server-side, mantenendo lo stesso provider/modello dell'assistente principale e togliendo un altro punto di contatto diretto browser-provider
- **Fondamenta deploy-ready per il live** - aggiunta la migration `20260418153000_add_telegram_ai_runtime`, introdotta `APP_BASE_URL` per webhook e deep link e aggiornato il percorso di deploy per gestire in modo sicuro la nuova major senza toccare i dati utente esistenti
- **Qualita' di release verificata** - suite confermata verde con `eslint`, `next build` e **211 test passati**

### v0.4.1 - 18 aprile 2026 (Calcolatore finanziamento + DTI prestiti)

- **Nuovo Calcolatore Rata Finanziamento** - la sezione `Strumenti` include ora un simulatore dedicato ai prestiti personali con ammortamento alla francese, pensato per auto, moto, arredamento e altri finanziamenti non immobiliari. Il tool consente di impostare importo, anticipo, TAN e durata fino a 10 anni e restituisce subito rata mensile, totale pagato, interessi complessivi e percentuale di costo del credito
- **Analisi DTI integrata con i prestiti gia' presenti in piattaforma** - il calcolatore puo' attribuire il nuovo finanziamento a Persona 1, Persona 2 oppure Entrambi e combina automaticamente la nuova rata con le rate gia' censite nel patrimonio. In questo modo il rapporto rata/reddito viene valutato sul carico debitorio reale gia' sostenuto dall'utente, invece che su una simulazione isolata
- **Feedback di sostenibilita' piu' concreto** - oltre al DTI percentuale, l'interfaccia evidenzia fascia verde/amber/rossa rispetto alle soglie bancarie, mostra quanta rata aggiuntiva resta sostenibile al 33% e rende piu' leggibile il piano di rimborso con riepilogo live, grafico annuale capitale/interessi/debito residuo e tabella dettagliata espandibile

### v0.4.0 - 17 aprile 2026 (Fondo pensione strutturato + PAC automatici)

- **FIRE meno ottimistico per ritiri anticipati** - il target FIRE usato da simulazione standard, stress test e Monte Carlo ora viene ricalcolato in base all'eta' effettiva di ritiro/soglia raggiunta, non solo sull'eta' pensionabile pianificata. Le pensioni pubbliche e le rendite future vengono quindi valorizzate solo quando partono davvero, evitando sottostime del capitale necessario per FIRE molto anticipati
- **Monte Carlo fino a fine vita utile** - il success rate non si ferma piu' a 30 anni o poco oltre: l'orizzonte della simulazione arriva fino alla `lifeExpectancy`, cosi' un FIRE a 40-45 anni viene stressato su tutta la durata prevista del piano
- **Cashflow FIRE separato dal risparmio familiare** - introdotto `monthlyPacBudget`: il campo FIRE diventa "PAC mensile extra al fondo pensione" e non viene piu' sovrascritto dal risparmio netto calcolato in Patrimonio. `monthlySavings` resta una metrica derivata del profilo familiare, mentre il budget investibile FIRE e' una preferenza dedicata
- **Fondo pensione per persona** - la configurazione del fondo pensione e' ora distinta per Persona 1 e Persona 2, con RAL annua dedicata, contributo volontario percentuale o fisso, contributo datore percentuale o fisso, TFR automatico e rimborso IRPEF calcolato per persona con cap deducibile separato
- **Accrediti automatici del fondo pensione in Patrimonio** - lo scheduler notturno applica il giorno 1 del mese gli accrediti dovuti di lavoratore, datore e TFR dentro `Altri Asset`, con ledger idempotente `PensionFundAccrual` e riepilogo di ultimo accredito, YTD e cumulato. Le modifiche manuali del saldo restano possibili e gli accrediti futuri si sommano al nuovo valore corrente
- **PAC automatici per singolo strumento** - ogni ETF/azione in Patrimonio ha un pulsante PAC con modal dedicata per creare, modificare, pausare o eliminare regole. Sono supportate cadenze settimanali, mensili, trimestrali, semestrali e annuali; piu' giorni sullo stesso asset si modellano con piu' regole
- **Motore PAC notturno idempotente** - lo scheduler controlla ogni notte le regole dovute, usa l'ultimo prezzo di chiusura disponibile dai provider gia' presenti, calcola quote frazionarie, aggiorna `customStocksList`/`stocksSnapshotValue` e registra ogni esecuzione come `executed`, `skipped` o `failed`
- **Export/import dati v2** - l'export utente include ora `monthlyPacBudget`, `pensionConfig`, regole PAC, esecuzioni PAC e accrual del fondo pensione. L'import v2 ripristina anche queste nuove entita' mantenendo compatibilita' con le chiavi legacy `patrimonio` e `obiettivi`
- **Milestone FIRE piu' trasparenti** - Lean/Fat FIRE vengono esplicitati come moltiplicatori euristici del target base, non come calcoli autonomi o garanzie di sostenibilita'
- **Copertura test ampliata** - aggiunti test su calcolo fondo pensione per persona, cap fiscale, TFR e scheduling PAC; suite aggiornata a 211 test passati

### v0.3.1 - 17 aprile 2026 (UX — Interesse Composto piu' educativo: punto di svolta + valore reale)

- **Nuova metrica "Punto di Svolta" nel calcolatore Interesse Composto** — il simulatore ora identifica ed evidenzia il primo anno in cui gli interessi maturati superano il totale dei contributi versati, rendendo concretamente visibile il momento in cui il capitale "lavora piu' di quanto venga alimentato". Il numero appare in una card KPI dedicata (icona Sparkles, accento amber) e la riga corrispondente nella tabella di ammortamento viene evidenziata con uno sfondo ambra e un'icona inline, cosi' l'utente puo' collegare a colpo d'occhio la metrica riassuntiva con il dettaglio anno per anno. Se l'orizzonte scelto e' troppo breve perche' l'incrocio avvenga (o il capitale iniziale parte gia' elevato rispetto ai contributi), la card mostra "non raggiunto in N anni" invece di un valore fuorviante
- **Nuovo slider Inflazione e KPI "Valore Reale"** — aggiunto un controllo dedicato all'inflazione attesa (0-10%, default 2.5%, step 0.1%) al pannello parametri. Il capitale finale viene deflazionato con fattore `(1 + i)^n` e mostrato in una nuova card KPI (icona TrendingDown, accento rose) come potere d'acquisto odierno, con sottotitolo esplicito "al netto X% inflazione". Prima dell'intervento il calcolatore comunicava solo valori nominali: un utente che simulava 30 anni con rendimento 7% vedeva cifre finali impressionanti ma senza alcun riferimento al loro reale potere d'acquisto, sottovalutando l'effetto erosivo dell'inflazione sulle proiezioni di lungo periodo. Ora il cruscotto restituisce contemporaneamente il dato nominale (capitale finale) e quello reale (valore reale), riallineando le aspettative a quanto davvero si potra' comprare con quel capitale
- **Perche' migliora l'esperienza** — queste due metriche trasformano il calcolatore da semplice simulatore numerico a strumento educativo: il "Punto di Svolta" materializza l'effetto compounding in un singolo numero memorizzabile ("dal dodicesimo anno il mio capitale produce piu' di quanto verso"), mentre il "Valore Reale" evita la trappola psicologica delle cifre nominali gonfiate dall'inflazione. Entrambi i KPI usano i pattern di UI gia' consolidati (card arrotondate, InfoTooltip per la spiegazione, palette consistente con il resto dell'app) senza introdurre dipendenze nuove
- **Compatibilita' totale** — nessun cambio alle API o ai tipi condivisi, la suite di 196 test unitari resta verde, calcoli derivati centralizzati in un singolo `useMemo` con dipendenze corrette incluso `inflationRate`

### v0.3.0 - 17 aprile 2026 (AI con allegati + FIRE coerente)

- **AI Advisor ora accetta immagini e PDF** - la chat supporta allegati reali via picker o incolla, con anteprima nel composer, rendering dentro i messaggi, persistenza nei thread e recupero protetto via API. OpenRouter riceve content parts compatibili con immagini/file e Gemini usa `inlineData`, con limiti centralizzati su numero e peso dei file
- **Persistenza completa degli allegati AI** - introdotto il modello Prisma `AssistantAttachment` e il salvataggio multipart su `/api/ai/threads/[id]/messages`, cosi' le conversazioni restano rileggibili anche dopo reload e un thread senza testo puo' usare il filename dell'allegato come titolo iniziale
- **FIRE piu' realistico sugli immobili** - il valore degli immobili non entra piu' nel capitale FIRE: contano solo le rendite nette, anche future, ricavate da `rentStartDate` e convertite in stream passivi nel motore Coast FIRE. Header KPI, tab FIRE e Riepilogo usano ora la stessa `computeFireMetricsFromSnapshot()` per evitare discrepanze
- **Dashboard sincronizzate in tempo reale** - cambi a patrimonio, preferenze FIRE o acquisti accettati propagano subito un evento client-side, cosi' overview, KPI in header e simulatore FIRE si aggiornano senza restare con dati stantii tra un tab e l'altro
- **Regressioni coperte lato FIRE** - aggiunti test su rendite passive future, rendite negative e calcolo centralizzato delle metriche FIRE per bloccare ritorni di incoerenze sul target netto

### v0.2.6 - 17 aprile 2026 (UX — validazione input numerici: vincolo min su tutti i campi finanziari)

- **Prevenzione valori negativi su tutti gli input numerici della piattaforma** — aggiunti attributi HTML `min="0"` (per importi e percentuali) e `min="1"` (per durate in anni e notti) su circa 50 campi `<Input type="number">` distribuiti in 10 componenti. Prima dell'intervento, l'utente poteva digitare valori negativi per importi mutuo, saldi debiti, tassi di interesse, canoni di affitto, costi IMU, quantita' BTC, contributi mensili e numerosi altri campi finanziari, producendo dati logicamente invalidi che si propagavano nei calcoli derivati (grafici, proiezioni FIRE, confronti mutui, strategie debito). Il browser ora impedisce la selezione di valori sotto la soglia tramite spinner e validazione nativa, fornendo un primo livello di difesa lato client senza modificare la logica applicativa esistente
- **Componenti aggiornati**: `inflation-calculator`, `subscription-tracker`, `debt-strategy`, `compound-interest-calculator`, `progressione-dashboard`, `patrimonio-dashboard`, `patrimonio/real-estate-section`, `rental-income`, `mortgage-simulator/mortgage-inputs`, `mortgage-simulator/mortgage-comparison`

### v0.2.5 - 17 aprile 2026 (fix critico — divisione per zero nei calcoli finanziari)

- **Bug finanziario critico risolto: divisione per zero in 4 moduli di calcolo** — identificata e corretta una famiglia di vulnerabilita' matematiche che producevano `NaN`, `Infinity` o loop infiniti quando l'utente inseriva valori zero o di confine per parametri critici (durata mutuo, tasso di prelievo SWR, rata minima debiti). I valori corrotti si propagavano nei grafici, nei KPI e nelle proiezioni FIRE, rendendo l'intera dashboard finanziariamente inaffidabile
- **Confronto Mutui (`mortgage-comparison.tsx`)** — con `anni = 0` (campo svuotato dall'utente), `numPayments = 0` causava divisione per zero nella formula della rata mensile francese `(P * r * (1+r)^n) / ((1+r)^n - 1)` e nel calcolo del debito residuo `P * ((1+r)^n - (1+r)^k) / ((1+r)^n - 1)`, producendo `Infinity` nella rata, `NaN` nel grafico Debito Residuo nel Tempo e valori assurdi nel riepilogo confronto. Fix: guard `numPayments > 0` prima di ogni divisione, con fallback a rata zero e debito residuo pari all'importo originale
- **Coast FIRE (`coast-fire.ts`)** — con `withdrawalRatePct = 0`, il FIRE target lordo `annualExpenses / (swr / 100)` produceva `Infinity`, che si propagava nel Coast FIRE target, nelle tre varianti Bear/Base/Bull e nel gap "quanto ti manca". Fix: clamp SWR a minimo 0.1% (`Math.max(0.1, withdrawalRatePct)`), allineato alla stessa guardia gia' presente in `fire-projection.ts` ma mancante in `coast-fire.ts`
- **Dashboard FIRE (`fire-dashboard.tsx`)** — stessa divisione per zero del Coast FIRE nel calcolo `grossFireTarget = annualExpenses / (fireWithdrawalRate / 100)`. Fix: stessa guardia `Math.max(0.1, ...)` applicata anche qui per coerenza
- **Strategia Debiti (`debt-strategy.ts`)** — con debiti a saldo zero/negativo o rata minima zero e nessun extra mensile, la simulazione snowball/avalanche entrava in un loop di 600 iterazioni senza progredire (nessun pagamento effettuato, interessi che si accumulano). Fix: filtro preventivo dei debiti con `balance <= 0`, clamp `rate` e `minPayment` a >= 0, early return quando il budget totale e' zero, e soglia di completamento abbassata da `0.01` a `0.005` per evitare residui fantasma
- **18 nuovi unit test** — `mortgage-comparison.test.ts` (12 test: rata standard, anni=0, tasso=0, tasso=0+anni=0, anticipo>=prezzo, prezzo=0, anni negativi, debito residuo a t=0/t=meta'/t=fine, debito con numPayments=0, debito a tasso 0%), `coast-fire.test.ts` (+3 test: SWR=0, SWR negativo, spese=0), `debt-strategy.test.ts` (+3 test: debiti con saldo zero/negativo, budget zero senza loop infinito, tassi negativi). Suite totale: **190 test passati**

### v0.2.4 - 17 aprile 2026 (UX — skeleton loader Abbonamenti Ricorrenti)

- **Skeleton loader per il tracker abbonamenti** — il componente `SubscriptionTracker` restituiva `null` durante il caricamento asincrono delle preferenze utente, lasciando un vuoto visivo nella pagina fino al completamento della fetch. Ora mostra uno skeleton strutturato che replica il layout reale del componente (titolo con icona, 3 righe abbonamento placeholder, e le due card riepilogo costo mensile/annuale), allineandosi al pattern gia' adottato nei tab FIRE, Riepilogo e nel fallback globale dei tab lazy-loaded. L'utente percepisce immediatamente il tipo di contenuto in arrivo invece di fissare un buco vuoto, migliorando la perceived loading performance specialmente su connessioni lente e dispositivi mobili

### v0.2.3 - 17 aprile 2026 (fix FIRE in tempo reale)

- **Mappa FIRE coerente in tempo reale** - il target FIRE, la timeline del viaggio, le milestone e le linee di riferimento ora si ricalcolano subito usando il capitale netto realmente richiesto dal piano, quindi modifiche a pensione pubblica, eta' pensionabile, eta' FIRE, rendita immobiliare e altri parametri aggiornano tutta la schermata in modo allineato
- **Auto-salvataggio piu' rapido e trasparente** - le preferenze FIRE vengono salvate con debounce piu' corto e la UI mostra chiaramente quando ci sono modifiche in attesa oppure un salvataggio in corso
- **Persistenza completata per i parametri FIRE** - `monthlySavings` e `includeIlliquidInFire` entrano nello schema validato, nel database e nel caricamento iniziale, evitando stati incoerenti tra impostazioni mostrate e dati realmente salvati
- **Test dedicati sulla logica Coast FIRE** - aggiunta copertura per verificare che pensione pubblica ed eta' pensionabile riducano davvero il target netto e il capitale richiesto

### v0.2.2 - 17 aprile 2026 (fix UI AI: solo risposta finale in italiano)

- **Niente piu' ragionamenti interni visibili in chat** - il bridge Gemini/Gemma ora filtra i `Part` marcati come `thought`, cosi' l'utente vede solo la risposta finale dell'assistente invece di thought summaries o note interne del modello
- **Comportamento italiano rinforzato** - il prompt operativo dell'AI Advisor esplicita che devono essere mostrati solo output finali rivolti all'utente, sempre in italiano, senza checklist o testo di lavoro
- **Test di regressione sul caso reale** - aggiunta copertura per il caso in cui Gemini restituisce un thought in inglese seguito dalla risposta finale in italiano, in modo da evitare ricadute su future modifiche del provider

### v0.2.1 - 17 aprile 2026 (fix AI Gemini)

- **Fix errore 400 Gemini su tool calling con enum numerici** - le `functionDeclarations` inviate a Gemini contenevano `enum` numerici (per esempio `mensilita` e `durata mutuo`) che l'API rifiuta se non rappresentati come stringhe. Il bridge Gemini ora normalizza ricorsivamente gli schemi dei tool convertendo `enum`, `type` e `default` in formato compatibile solo per il provider Google, senza alterare il comportamento OpenRouter
- **Copertura di regressione dedicata** - aggiunto un test su `geminiSanitizeSchema()` per bloccare il ritorno di questo bug su futuri tool con enum numerici

### v0.2.0 — 16 aprile 2026 (versioning release)

- **Numero versione ufficiale nel repo** - `package.json` diventa la fonte canonica della versione software e viene portato a `v0.2.0`, con script dedicati per incrementi `patch`, `minor` e `major`
- **Versione visibile anche nel frontend** - aggiunta una micro-etichetta grigia sotto il logo nell'header principale, pensata per essere sempre disponibile ma visivamente discreta
- **Processo di rilascio reso esplicito** - documentato nel repository che ogni deploy applicativo deve allineare numero versione e changelog, cosi' l'avanzamento del software resta sempre tracciabile

### 16 aprile 2026 (fix critico debiti — rollover rate minime + edge-case obiettivi e Monte Carlo)

- **Bug finanziario critico risolto: strategia Snowball/Avalanche senza rollover** — `simulatePayoff()` in `debt-strategy.tsx` non ridirezionava le rate minime dei debiti estinti verso il debito prioritario successivo. Questo e' il meccanismo fondamentale di entrambe le strategie: quando un debito viene saldato, la sua rata minima diventa budget aggiuntivo per accelerare l'estinzione del debito successivo. Il codice originale inizializzava `remaining = extraMonthly` ad ogni iterazione, ignorando completamente le rate liberate. Con il fix, il budget mensile totale e' calcolato come `somma(tutte le rate minime) + extraMonthly`, le rate minime attive vengono scalate dal budget, e tutto il residuo (incluse le rate dei debiti gia' estinti) viene applicato al debito prioritario. Esempio concreto: con 2 debiti (Carta €5.000 min €100 al 18%, Auto €12.000 min €250 al 5.5%) e €200 extra, il vecchio codice produceva una simulazione piu' lenta perche' dopo aver estinto la Carta, i €100/mese della sua rata svanivano nel nulla invece di accelerare l'Auto
- **Modulo `src/lib/finance/debt-strategy.ts` estratto e testato** — la logica di simulazione e' stata estratta dal componente UI in un modulo puro importabile e testabile, con 12 nuovi unit test che coprono: lista vuota, singolo debito, rollover a 2 e 3 debiti, ordinamento snowball/avalanche, avalanche < snowball in interessi, overpayment quando rata > saldo, tasso zero, safety cap 600 mesi, e extra = 0
- **Fix obiettivi scaduti: importo fuorviante** — `getDeadlinePacing()` in `savings-goals.tsx` restituiva `requiredMonthly: remaining` (l'intero importo mancante) per obiettivi con scadenza superata, mostrando es. "€5.000/mese" come se fosse un contributo mensile quando in realta' era il totale residuo. Ora restituisce `requiredMonthly: 0` e l'UI mostra correttamente l'importo mancante con label "ancora da risparmiare". Inoltre, `historicalMonthly` non viene piu' forzato a 0 per gli obiettivi scaduti: il ritmo storico di risparmio resta visibile come contesto utile
- **Fix indice percentili Monte Carlo** — in `monte-carlo.worker.ts`, gli indici per p10/p50/p90 calcolati con `Math.floor(runsCompleted * 0.9)` potevano teoricamente accedere fuori dall'array per chunk molto piccoli. Aggiunto `Math.min(..., runsCompleted - 1)` come clamp di sicurezza
- **Suite test** — da 156 a **168 test passati** (+12 nuovi test su `debt-strategy.test.ts`)
### 16 aprile 2026 (AI persistente, Performance, Dividendi e Report)

- **AI Advisor con thread persistenti e memoria utente su database** - la chat AI non vive piu' solo nello stato client: sono stati aggiunti thread salvati (`AssistantThread` + `AssistantMessage`) con sidebar conversazioni, rinomina/eliminazione, memoria persistente (`AssistantMemory`) con pin manuale e auto-estrazione dei fatti stabili dalle conversazioni. Il vecchio store `session-memory` e' stato rimosso e il system prompt ora combina profilo utente, snapshot dati e memoria storica.
- **Tool calling AI molto piu' ampio (23 strumenti)** - l'assistente puo' interrogare patrimonio, storico net worth, allocazione asset, performance portafoglio, dividendi, budget, obiettivi, preferenze, portafoglio titoli, quote bond via ISIN, oltre a eseguire calcoli Coast FIRE, sensitivity matrix FIRE, Monte Carlo, ammortamento mutuo, stipendio netto, sale tax e piani di accumulo. In pratica l'AI passa da "chat con qualche tool" a vero copilota operativo sui dati dell'utente.
- **Nuovo tab Performance** - aggiunta una dashboard dedicata con metriche ROI, CAGR, TWR, MWR/IRR, volatilita', Sharpe ratio, max drawdown, drawdown corrente e durata/recovery, piu' heatmap dei rendimenti mensili, grafico underwater e calendario dividendi. Inclusa anche una finestra di analisi AI focalizzata sulla performance del portafoglio.
- **Dividendi e bond entrano nel prodotto in modo strutturato** - nuovo modello `DividendRecord` con API CRUD, endpoint statistiche, scraping storico dividendi da Borsa Italiana per ISIN, ritenuta italiana applicata automaticamente e conversione in EUR. In parallelo il recupero prezzi titoli supporta ora il fallback per obbligazioni italiane via MOT/Borsa Italiana e nel portafoglio compare una modal per simulare l'impatto fiscale di una vendita (26% azioni/ETF, 12.5% titoli di stato, con compensazione minusvalenze).
- **FIRE piu' ricco e piu' robusto** - il dashboard FIRE ora include il pannello "Coast FIRE - scenari di mercato" e la matrice di sensitivita' spese/risparmio; inoltre e' stato corretto un bug potenziale di Rules of Hooks legato al worker Monte Carlo, spostando `useRef` e cleanup prima degli early-return.
- **Export report patrimoniale pronto per PDF/stampa** - nel top bar appare il nuovo `ExportReportModal`, da cui l'utente sceglie quali sezioni includere (Patrimonio, Allocazione, Performance, FIRE, Mutuo/Debiti, Dividendi). Il report viene generato su `/report/export`, impaginato per stampa e pensato per essere salvato facilmente in PDF dal browser.
- **Refactor dati e compatibilita' mercati** - `user-data` ora esporta anche i dividendi, i tassi FX coprono anche CHF/JPY/CAD/AUD oltre a USD/GBP, e la normalizzazione prezzi/dividendi in EUR e' stata centralizzata in `normalizePriceToEur()` per evitare conversioni duplicate e incoerenti tra route diverse.

### 16 aprile 2026 (UX — allocazione asset leggibile e accessibile nel Riepilogo)

- **Percentuali visibili nella legenda allocazione asset** — la barra di asset allocation nel tab Riepilogo mostrava le percentuali di ogni categoria (Immobili, Liquidita' & ETF, Crypto, Altro) solo tramite attributo `title` sulle sezioni colorate della barra. Gli utenti su mobile e tablet non potevano in alcun modo visualizzare questi valori (il `title` richiede hover con il mouse). Ora ogni voce della legenda mostra il valore percentuale in grassetto accanto al nome della categoria, rendendo l'informazione immediatamente visibile su qualsiasi dispositivo senza necessita' di interazione
- **Accessibilita' screen reader** — aggiunto `role="img"` e `aria-label` descrittivo alla barra di allocazione, cosi' gli screen reader leggono il breakdown completo ("Allocazione asset: Immobili 45.2%, Liquidita' & ETF 30.1%, ...") invece di ignorare silenziosamente un elemento puramente decorativo. Rimossi i `title` individuali dai segmenti (ora ridondanti con la legenda visibile e l'aria-label sul contenitore)
- **Pulizia dead code** — rimossa la variabile `sparkData` (array di 30 punti per sparkline) che veniva calcolata dentro il `useMemo` principale ma mai restituita ne' renderizzata, eliminando un'allocazione inutile ad ogni ricalcolo delle metriche

### 16 aprile 2026 (fix critico FIRE — rendita immobiliare negativa + IRPEF + UI)

- **Bug finanziario critico risolto: rendita immobiliare negativa ignorata** — `calculatePropertyAnnualNetIncome()` in `src/lib/finance/real-estate.ts` applicava `Math.max(0, rent - totalCosts)`, azzerando silenziosamente la perdita di immobili in cui i costi superano l'affitto. Quando un utente aveva sia un immobile redditizio (+€9k) sia uno in perdita (-€2.5k), il sistema calcolava un reddito passivo totale di €9k invece del corretto €6.5k, sottostimando il target FIRE di decine di migliaia di euro (es. con SWR 4% e spese €30k/anno: target calcolato €525k invece del corretto €587.5k, errore di **€62.5k / 12%**). Il bug si propagava nel Monte Carlo, nel calcolo deterministico FIRE, nel Coast FIRE e nel consulente acquisti — ovunque venisse usata `sumRealEstateAnnualNetIncome()`. Fix: rimosso il floor, la rendita netta puo' ora essere negativa e viene correttamente compensata nella somma aggregata
- **IRPEF_BRACKETS costante disallineata** — il secondo scaglione in `src/lib/constants.ts` dichiarava aliquota 0.35 (35%, scaglioni 2024) ma il motore di calcolo effettivo `irpef.ts` usava correttamente 0.33 (33%, scaglioni 2026). Aggiornata la costante e il commento a "IRPEF 2026" per prevenire errori in futuri refactor che la importassero al posto dei valori hardcoded
- **Fix NaN nel calcolatore interesse composto** — quando capitale iniziale e contributo mensile erano entrambi 0, la percentuale "da interessi composti" calcolava `0/0 = NaN`, mostrando "NaN%" nell'UI. Aggiunto guard: se il bilancio finale e' zero, mostra 0%
- **Pulizia dead code IRPEF detrazioni** — `Math.max(690, 1955)` in `irpef.ts` restituiva sempre 1955 (690 e' strettamente minore): semplificato a `1955` per chiarezza
- **Test aggiornati e nuovi** — aggiornato il test `real-estate.test.ts` per verificare che la rendita negativa venga correttamente propagata (non piu' azzerata), aggiunto test di regressione che dimostra l'impatto sul reddito passivo aggregato con immobili misti, aggiornato `constants.test.ts` per aspettarsi 0.33 nel secondo scaglione. Suite totale: **156 test passati**

### 16 aprile 2026 (UX — skeleton loader per caricamento tab e simulatore FIRE)

- **Skeleton loader globale per tutti i tab** — il `TabFallback` usato come Suspense fallback per tutti i 9 tab lazy-loaded e' stato trasformato da un semplice spinner centrato in uno skeleton strutturato che mima il layout tipico di una dashboard: blocco hero con titolo/sottotitolo, griglia di 4 card metriche e area grafico. Cosi' l'utente percepisce immediatamente il tipo di contenuto in arrivo invece di fissare uno spinner anonimo, migliorando significativamente la perceived loading performance su ogni cambio tab (specialmente su connessioni lente o dispositivi meno potenti)
- **Skeleton dedicato per il simulatore FIRE** — il tab FIRE (uno dei piu' pesanti: ~1150 righe, fetch preferenze + patrimonio + calcoli derivati) ora mostra uno skeleton strutturato durante il caricamento iniziale dei dati, con 5 card KPI placeholder, barra tab e area grafico. Prima il componente renderizzava immediatamente con tutti i valori a zero (€0 patrimonio, 0 anni al FIRE, obiettivo €0) causando un flash confuso di dati falsi prima che i valori reali apparissero — un pattern che poteva sembrare un bug. L'`isLoadingUser` flag gia' presente e' stato riutilizzato come gate per il rendering dello skeleton, senza aggiungere stato nuovo
- **Cleanup import** — rimossa l'importazione inutilizzata di `Loader2` da `page.tsx` (l'icona spinner non serve piu' nel nuovo TabFallback basato su Skeleton)

### 16 aprile 2026 (AI Advisor v2 — profilo utente, tool calling, derived data, API key cifrata)

- **"Parlami di te" — profilo personale persistente iniettato in ogni prompt** — nuovo pulsante in header al tab AI che apre un modal con textarea libera (max 8000 caratteri) dove l'utente racconta eta', lavoro, situazione familiare, obiettivi di vita, tolleranza al rischio, vincoli e preferenze d'investimento. Il testo viene salvato sul DB nel modello `Preference.aiUserProfile` (cross-device, sopravvive ai refresh) e iniettato in ogni system prompt come blocco dedicato `--- PROFILO UTENTE ---` separato dallo snapshot dati. Cosi' l'AI ha sempre il contesto su CHI sei prima di guardare i numeri. Status bar mostra "Profilo: compilato (N car.)" / "vuoto — clicca per compilare" come scorciatoia
- **Tool calling — l'AI esegue calcoli precisi invece di stimare a parole** — registry di 7 tool dichiarati in `src/lib/ai/tools.ts` e supportati su entrambi i provider (Gemini con `functionDeclarations`, OpenRouter con formato OpenAI `tools`/`tool_calls`). I tool: `calculate_mortgage_amortization` (rata francese + schema annuale), `calculate_net_salary` (RAL → netto IRPEF/INPS/cuneo 2025-2026 riusando `lib/finance/irpef.ts`), `run_fire_monte_carlo` (2000 traiettorie con percentili p10/p50/p90 + success rate vs target), `get_stock_price` (Yahoo + fallback Stooq via API esistente), `get_bitcoin_price` (Binance), `get_mortgage_market_offers` (top 8 offerte scrapate da MutuiSupermarket), `get_net_worth_delta` (variazione patrimonio tra due date arbitrarie). Loop multi-turn implementato in `providers.ts` con cap a 6 round-trip per evitare loop infiniti. Trace dei tool eseguiti visibile in UI: badge espandibile "N strumenti usati" sotto ogni messaggio assistant con args + risultato JSON, e durante l'esecuzione chip in tempo reale "Eseguo strumenti (N)..." con i nomi dei tool che stanno girando
- **Dati arricchiti: blocco `derived` aggregato lato server** — `/api/user-data?ai=1` ora restituisce, oltre allo snapshot grezzo, un blocco `derived` con aggregati pronti pensati per il consumo LLM: `netWorth.timeline` (serie storica patrimonio con breakdown per asset class), `netWorth.deltas` (MoM, YoY, YTD, since first in % e assoluti), `allocation` corrente per Immobili/Azioni-ETF/BTC/Beni rifugio/Liquidita'/Pensione, `budget` con saving rate medio + ultimi 3 mesi + top 5 categorie, `subscriptions` totale mensile/annuale, `goals` con % progress e mensile-per-target, `fire.quickCheck` con net worth/target/gap/anni a retirement, `market` con valori correnti. L'AI usa direttamente questi numeri invece di scorrere a mano centinaia di snapshot, riducendo errori di calcolo e latency
- **API key opzionalmente cifrata sul server (AES-256-GCM) per sync cross-device** — toggle "Ricorda su questo account" nel modal Impostazioni AI: se attivo, la API key viene cifrata con AES-256-GCM (`src/lib/crypto.ts` usando `crypto.createCipheriv` con IV random 12 byte + auth tag 16 byte, payload base64) usando una chiave master `ENCRYPTION_KEY` lato server, e salvata nei nuovi campi `Preference.aiApiKeyEnc/aiProvider/aiModel/aiRememberKeys`. Al login successivo (anche da un altro browser/dispositivo) `useAiSettings` idrata automaticamente localStorage dalla risposta del nuovo endpoint `/api/ai-settings` (GET/POST/DELETE protetti da auth + Zod). Default: toggle OFF, comportamento invariato (solo localStorage). Documentazione in `DEPLOY.md`: la `ENCRYPTION_KEY` va impostata UNA volta sola e mai cambiata (perdere la chiave master = tutte le API key salvate diventano illeggibili)
- **Trasparenza — descrizione modal Impostazioni AI riscritta** — il modal ora spiega esplicitamente cifratura AES-256-GCM, link al repo open source per verifica indipendente, e che la chiave non viene mai loggata ne' usata per altro che restituirla all'utente al login. Nessuna garanzia matematica zero-knowledge (la chiave master e' sul server, decifrabile da chi ha accesso al codice + DB), ma trasparenza completa
- **Fix lint pre-esistente — `overview-dashboard.tsx`** — rimossa la chiamata sincrona `setLoading(false)` dentro un `useEffect` (violazione di `react-hooks/set-state-in-effect`): il branch era inutile perche' il caso `!user` rendeva gia' `<WelcomeOnboarding />` prima del check di loading. Ripuliti anche due `eslint-disable` ormai inutili in `user-data/route.ts` e `fire-dashboard.tsx`. Build ora lint-clean (0 errori, 0 warning)

### 16 aprile 2026 (AI Advisor — chatbot personalizzato con memoria di sessione)

- **Nuovo tab AI con chatbot integrato** — aggiunta una nuova sezione "AI" (icona robot viola) accanto a "Strumenti" che permette all'utente di conversare con un assistente finanziario personale e ottenere consigli basati sui dati reali della piattaforma. Ad ogni messaggio il sistema inietta automaticamente nel system prompt l'intero snapshot dati dell'utente (lo stesso JSON che si otterrebbe cliccando "Esporta dati" dall'ingranaggio), così l'AI conosce patrimonio, obiettivi, preferenze FIRE, mutuo, budget e transazioni senza bisogno di spiegazioni manuali
- **Supporto dual-provider: Google Gemini e OpenRouter** — l'utente può scegliere liberamente tra i due provider dalla nuova voce "Impostazioni AI" nel menu ingranaggio. Per ogni provider inserisce la propria API key (salvata solo nel browser in `localStorage`, mai inviata al nostro server) e sceglie il modello da usare. C'è un pulsante "Carica elenco" che interroga dinamicamente `GET /v1beta/models` (Gemini) o `/api/v1/models` (OpenRouter) per popolare il selettore con tutti i modelli disponibili per quella chiave, oppure si può digitare manualmente l'id del modello
- **Architettura privacy-first: le chat non passano dal server** — le richieste al modello partono direttamente dal browser verso `generativelanguage.googleapis.com` o `openrouter.ai`. Il backend vede solo il `GET /api/user-data` iniziale (identico al pulsante Esporta dati già esistente) e nulla del traffico AI, API key inclusa. Un adapter unificato `src/lib/ai/providers.ts` astrae le differenze tra le due API (sistema `systemInstruction` su Gemini, `role: system` su OpenRouter)
- **Memoria conversazionale con persistenza cross-tab** — ogni turno include lo storico completo dei messaggi, quindi l'AI capisce follow-up e riferimenti ("e per il secondo obiettivo?"). Lo stato vive in uno store a livello di modulo (`src/lib/ai/session-memory.ts` con pattern `useSyncExternalStore`) che sopravvive al mount/unmount del componente: cambiando tab e tornando su "AI" la conversazione è ancora lì. Al reload della pagina invece la chat si azzera — nessuna persistenza server-side, nessun impatto sul VPS
- **UX della chat** — prompt di esempio cliccabili quando la chat è vuota ("Analizza il mio FIRE number", "Come dovrei ribilanciare il portafoglio?", ecc.), indicatore del provider/modello attivo e del contesto iniettato (in KB), pulsante "Aggiorna dati" per forzare il refresh dello snapshot dopo modifiche in altri tab, pulsante "Pulisci" per resettare la conversazione, invio con Enter e nuova riga con Shift+Enter, auto-scroll al nuovo messaggio
- **Export/Import dati completi — aggiunta tabella `BudgetTransaction`** — prima del lavoro AI l'export utente (`/api/user-data`) si dimenticava delle transazioni del Budget Tracker (inclusi i CSV bancari importati). Ora l'export include anche `budgetTransactions` con tutti i campi (`date`, `description`, `amount`, `category`, `categoryOverride`, `hash`), l'import Zod le valida e le reinserisce preservando gli `hash` originali per deduplicare eventuali re-import incrementali da CSV. Toast di conferma import aggiornato con il conteggio delle transazioni importate

### 15 aprile 2026 (calcolatore inflazione — KPI "Capitale Equivalente Futuro" + DRY su Fisher)

- **Nuovo KPI "Capitale Equivalente Futuro"** — il calcolatore inflazione mostra ora, accanto al "Potere d'Acquisto Finale" (quanto valgono in euro odierni i tuoi soldi tenuti fermi), anche la metrica inversa: quanti euro NOMINALI servono fra N anni per acquistare gli stessi beni che oggi compri con `amount` euro. Risponde alla domanda piu' pratica per un piano di accumulo — "se voglio comprare casa fra 15 anni a 200k €, di quanto deve crescere il mio target nominale per non essere eroso dall'inflazione?". La card sostituisce la vecchia "Valore Perso" (informazione duplicata rispetto al sotto-titolo della prima card) e l'erosione inflazionistica e' ora riassunta in una riga contestuale piu' leggibile sotto il pannello KPI
- **Indicatore "perdita reale"** — quando il rendimento nominale e' inferiore all'inflazione (rendimento reale < 0) la card "Valore Reale Investito" mostra in rosso il tag "(perdita reale)" accanto alla percentuale. Cosi' chi simula scenari conservativi (es. conto deposito al 2% con inflazione al 3%) capisce subito che sta perdendo potere d'acquisto anche se il saldo nominale cresce
- **Nuovo modulo `src/lib/finance/inflation.ts`** — la logica di proiezione e' stata estratta dal componente UI in una funzione pura `projectInflation()` che restituisce punti del grafico, valori finali, erosione, capitale equivalente e rendimento reale. Il modulo delega il calcolo del rendimento reale al singleton `computeRealReturn()` di `fire-projection.ts`, eliminando l'ULTIMA copia inline della formula di Fisher rimasta nel progetto (le altre tre erano gia' state consolidate nel commit precedente). La funzione e' robusta a input NaN/Infinity, anni frazionari (troncati), `amount = 0`, `years = 0` e inflazione = -100% (scenario degenere)
- **13 nuovi unit test in `inflation.test.ts`** — coprono Fisher esatto vs sottrazione, simmetria fra capitale equivalente futuro e potere d'acquisto residuo, equivalenza fra valore reale e valore nominale scontato, scenari edge (amount/years zero, NaN, inflazione zero, rendimento nominale = inflazione) e regressione contro un futuro cleanup che reintroduca la formula inline. Suite totale: da 142 a **155 test passati**

### 15 aprile 2026 (fix critico FIRE — liquidazione fondo pensione)

- **Bug fix matematico — fondo pensione mai liquidato** — risolto un bug finanziariamente critico nel simulatore FIRE (deterministico, Monte Carlo e stress test "Lost Decade"). La logica originale usava una strict equality `yAge === pensionFundAccessAge` per decidere quando liquidare il fondo pensione complementare: se l'utente aveva gia' superato l'eta' di accesso (es. 65 anni con accesso a 62) OPPURE inseriva un'eta' non intera, il trigger non scattava MAI e il capitale del fondo pensione cresceva all'infinito senza mai essere convertito in rendita/capitale netto. Di conseguenza, la proiezione FIRE ignorava completamente il patrimonio del FP nelle spese di ritiro, sottostimando il successo del piano — in particolare per utenti gia' prossimi al pensionamento
- **Nuovo modulo `src/lib/finance/pension-fund.ts`** — estratta la logica di liquidazione in due helper puri e testabili: `liquidatePensionFund()` (applica tassazione in uscita, calcola rendita mensile e quota lump-sum per modalita' `annuity` o `hybrid`, clamp tax rate a [0,100], gestione edge-case `lifeExpectancy <= accessAge` evitando divisione per zero) e `shouldLiquidatePensionFund()` (trigger idempotente con flag `hasAccessed` + confronto `>=`, robusto a eta' frazionarie e a currentAge > accessAge)
- **Suite di test regressione** — 12 nuovi unit test in `pension-fund.test.ts` che coprono: modalita' annuity/hybrid, edge-case capitale zero/negativo/NaN, clamping aliquote fuori scala, protezione da divisione per zero, e i due scenari del bug originale (currentAge > accessAge e eta' frazionarie)

### 15 aprile 2026 (obiettivi — riepilogo con totali aggregati e ordinamento per urgenza)

- **Riepilogo obiettivi piu' ricco** — la card "Progresso Totale" del tab Obiettivi di Risparmio ora mostra tre nuovi KPI aggregati in un terzetto di mini-card: "Da risparmiare" (quanto manca complessivamente al raggiungimento di tutti gli obiettivi), "Ritmo richiesto" (somma dei contributi mensili necessari per rispettare tutte le scadenze attive) e "Completati" (contatore X/Y di obiettivi gia' raggiunti). Prima l'utente aveva solo la somma corrente/target e la percentuale: ora ha anche la risposta immediata alla domanda piu' pratica — "quanto devo mettere da parte ogni mese in totale per stare in carreggiata?"
- **Ordinamento intelligente delle card obiettivo** — le card sono ora ordinate per urgenza invece che per data di creazione: prima quelli scaduti, poi in ritardo, poi da accelerare, poi in linea, poi gli obiettivi senza scadenza e infine i completati. A parita' di stato il tie-breaker e' la scadenza piu' vicina, cosi' l'obiettivo piu' critico e' sempre in cima senza bisogno di scrollare. Migliora significativamente l'usabilita' per chi gestisce molti obiettivi in parallelo
- **Refactor interno con `useMemo`** — l'estrazione di totali, conteggi, pacing e lista ordinata e' stata unificata in un singolo `useMemo` su `goals`, eliminando doppi calcoli di `getDeadlinePacing` (prima invocata sia in map che in derived) e nuova funzione `getGoalSortPriority` pura per assegnare la priorita' di ordinamento in base allo stato del pacing

### 15 aprile 2026 (FIRE — fix rendimento reale con equazione di Fisher esatta)

- **Bug finanziario critico risolto nel calcolo del rendimento reale** — il motore FIRE (`fire-projection.ts`), il tab FIRE (`fire-dashboard.tsx`) e il consulente acquisti (`advisor-dashboard.tsx`) calcolavano il rendimento reale con la formula approssimata `realReturn = (nominal − inflation) / 100`. Per tassi tipici di un piano FIRE (7% nominale, 3% inflazione) questa scorciatoia dava 4.000% mentre l'equazione di Fisher esatta da' 3.883% — un errore relativo del ~3% che si compone nel tempo: su 30 anni portava a sovrastimare il capitale finale di circa il +3-4% e ad anticipare artificialmente il momento FIRE di quasi un anno. Peggio ancora, il calcolatore inflazione (`inflation-calculator.tsx`) usava gia' la formula corretta, quindi la stessa app mostrava **rendimenti reali diversi a seconda del tab** visitato
- **Unica fonte di verita' per il rendimento reale** — introdotta la funzione pura `computeRealReturn(nominalPct, inflationPct)` in `src/lib/finance/fire-projection.ts` che applica Fisher esatto `(1 + nominale) / (1 + inflazione) - 1` e include sanitizzazione degli input (NaN → 0) e guard contro scenari degeneri (inflazione ≤ -100%). Tutti i moduli finance ora usano questo helper, eliminando le tre copie della formula sbagliata e garantendo coerenza tra FIRE dashboard, advisor e calcolatore inflazione
- **Proiezione FIRE piu' robusta** — in `projectFire` il `monthlyRate` e' ora protetto contro rendimenti reali ≤ -100% (prima avrebbe prodotto `NaN` nel ciclo di simulazione) e anche il `coastFireTarget` ha un fallback sicuro nello stesso scenario degenere
- **Regressione bloccata da 18 nuovi test** — nuovo file `fire-projection.test.ts` con copertura completa di `computeRealReturn` (Fisher vs sottrazione, reale negativo, input NaN, inflazione iperbolica) e di `projectFire` (fireTarget corretto, scenari con/senza acquisto, output non negativi, `alreadyFire`, coerenza con il calcolatore inflazione). Suite totale: da 112 a **130 test passati**

### 15 aprile 2026 (obiettivi — contributo mensile richiesto e pacing badge)

- **Contributo mensile necessario** — ogni obiettivo di risparmio con scadenza ora mostra quanto devi mettere da parte ogni mese per arrivare al traguardo in tempo. Il calcolo e' semplice ma trasparente: `(obiettivo − gia' risparmiato) / mesi rimanenti`, cosi' invece di vedere solo "8 mesi rimanenti" capisci subito che servono ad esempio "1.000 €/mese per 8 mesi"
- **Badge di stato In linea / Da accelerare / In ritardo / Scaduto** — confrontando il ritmo storico di accumulo (calcolato dal momento di creazione dell'obiettivo) con quello richiesto per rispettare la scadenza, la card mostra un badge colorato con icona: verde "In linea" se stai mantenendo il passo, ambra "Da accelerare" se sei oltre il 60% del target ma sotto il necessario, rosso "In ritardo" se sei sotto quella soglia, e "Scaduto" se la deadline e' passata senza raggiungere l'obiettivo. Tooltip esplicativo on-hover su ogni badge
- **Ritmo attuale visibile** — sotto al contributo richiesto viene mostrato anche il ritmo effettivo di risparmio ("Ritmo attuale: X €/mese"), cosi' l'utente ha sia il target sia la realta' sott'occhio e capisce esattamente di quanto deve aumentare lo sforzo. Niente piu' obiettivi "impostati e dimenticati": il feedback sul pacing e' immediato e azionabile

### 15 aprile 2026 (FIRE — fix IMU + nuovi KPI storici nel Riepilogo)

- **Fix double-count IMU nella rendita passiva FIRE** — nel tab FIRE, il calcolo della rendita passiva immobiliare sottraeva l'IMU due volte: una volta dentro `calculateNetRentalYield` (che restituisce gia' il rendimento netto di tutte le spese) e una seconda volta nel ciclo di somma in `fire-dashboard.tsx`. Conseguenza: gli utenti con immobili locati vedevano una rendita passiva sottostimata, e quindi un target FIRE piu' distante del reale. Bug corretto estraendo la logica in un nuovo modulo puro `src/lib/finance/real-estate.ts` con le funzioni `calculateNetRentalIncome` e `sumNetRentalIncome`, ora coperte da **118 righe di unit test** (`real-estate.test.ts`) che verificano casi con/senza affitto, IMU gia' scorporata e scenari con immobili multipli
- **Refactor fire-dashboard.tsx** — il componente orchestratore scende da ~920 a ~885 righe delegando il calcolo della rendita passiva al nuovo modulo; meno logica inline nel componente UI, piu' testabilita'
- **Nuovi KPI storici nel Riepilogo: CAGR e Max Drawdown** — due card aggiuntive in cima al tab Riepilogo che analizzano la serie storica degli snapshot patrimoniali:
  - **CAGR annualizzato** (Compound Annual Growth Rate): tasso di crescita medio composto del patrimonio netto, calcolato sulla distanza temporale effettiva tra primo e ultimo snapshot. Si attiva quando c'e' almeno un anno di storia e mostra "N/A" con tooltip esplicativo negli altri casi
  - **Max Drawdown**: massima perdita percentuale da un picco storico a un minimo successivo, indicatore chiave di volatilita' e resilienza del portafoglio nei momenti peggiori (utile per capire se si e' psicologicamente pronti a reggere un bear market)
- **Modulo `src/lib/finance/history-stats.ts`** — nuove funzioni pure `calculateCAGR(snapshots)` e `calculateMaxDrawdown(snapshots)` coperte da 105 righe di unit test (`history-stats.test.ts`). Isolate dal componente UI per poter essere riutilizzate altrove (es. grafici storici, report export)
- **Suite test** — da 88 a **111 test passati** (+23 nuovi test sui due moduli finance)

### 14 aprile 2026 (riepilogo — tooltip breakdown patrimonio netto)

- **Tooltip "cosa ha mosso il patrimonio"** — passando col mouse sopra la cifra del Patrimonio Netto nel tab Riepilogo appare un pannello a scomparsa che spiega in dettaglio da dove arriva la variazione rispetto allo snapshot precedente. Il breakdown mostra il delta per ciascuna categoria (Liquidita' & ETF, Fondo Emergenza, Bitcoin, Beni Rifugio, Fondo Pensione, Debiti), con la percentuale di contributo al movimento totale, ordinato per impatto assoluto e con riga "Totale" finale che combacia con il +/-€ mostrato sotto. I debiti sono invertiti (una riduzione debiti conta come contributo positivo), cosi' l'utente capisce subito se il mese e' andato bene grazie a mercato, risparmio o deleveraging

### 14 aprile 2026 (consulente acquisti v2.1 — fix su dati reali)

- **Impatto patrimoniale su investibile** — il peso dell'acquisto ora e' misurato sul "patrimonio investibile" (asset totali − immobili − debiti) invece che sul patrimonio netto totale. Per chi ha casa di proprieta', un'auto da 30k non "vale" il 2% dei 1.4M totali: vale il 6% dei 500k realmente mobilizzabili, ed e' questa la cifra che conta
- **Coast FIRE supportato** — il grafico Impatto FIRE non mostra piu' "non calcolabile" quando il risparmio mensile e' 0: se hai capitale gia' accumulato, il motore proietta comunque la crescita dell'investito e l'erosione causata dall'acquisto, con banner "Modalita' Coast FIRE" esplicativo
- **Verdetto numerico** — il verdetto finale ora cita i numeri concreti: "ti costa X totali in N anni, sposta il FIRE di circa M mesi, include Y di mancato rendimento". Niente piu' frasi generiche, solo impatto misurabile
- **Mesi di copertura basati sulle spese** — l'emergency fund dopo l'acquisto e' calcolato su `liquidita' residua / (spese + rate)`, non piu' sul reddito. Cap semantico "oltre 24 mesi (abbondante)" invece di stringhe tipo "255.7 mesi"
- **Pesatura su prestiti multipli** — se hai gia' 2+ finanziamenti in corso, scatta un avviso cumulativo dedicato e il verdetto viene spinto verso "cautela" perche' gli impegni si sommano e la resilienza agli imprevisti si riduce su piu' fronti
- **Acquisti accettati in cima** — la lista dei finanziamenti gia' accettati nel Consulente e' stata spostata in cima alla pagina (prima del form di simulazione), con totali impegno TCO e rate mensili aggregate. Cosi' vedi l'impegno cumulato prima di aggiungerne un altro
- **Ordine didattico delle sezioni** — "Come abbiamo calcolato" ora precede i grafici di impatto: prima capisci da dove vengono i numeri, poi vedi le conseguenze (Impatto FIRE → Confronto Scenari → Sensitivita' → ammortamento)
- **Rimossa proiezione patrimoniale legacy** — il vecchio chart "Con vs Senza acquisto" di PurchaseImpactChart e' stato eliminato: mostrava "differenza -€0" quando il risparmio era 0 ed era ridondante con il grafico Impatto FIRE piu' robusto
- **Default svalutazione auto 20%** — bumpato da 15% per riflettere meglio la svalutazione reale di auto nuove (specie EV: 20-25%/anno)

### 14 aprile 2026 (consulente acquisti v2)

- **Consulente usa tutti i dati dell'utente** — fix della sorgente dati (l'API ritorna `history`, non `records`, quindi prima lo snapshot era vuoto) e caricamento completo delle preferenze: spese mensili reali da `expensesList` (gestisce `isAnnual`), risparmio reale (`reddito - spese - rate esistenti`) invece del 20% hardcoded, rata totale dei prestiti gia' in corso calcolata con `getInstallmentAmountForMonth`, DTI pre-acquisto e post-acquisto (con rate esistenti incluse), parametri FIRE personali (anno di nascita, eta' pensione, spese attese, SWR, rendimento, inflazione). Il costo opportunita' ora usa il rendimento reale dell'utente (nominale - inflazione) invece del 7% fisso
- **Grafico Impatto FIRE** — nuova sezione che sovrappone due curve di proiezione del capitale (con e senza acquisto) fino al raggiungimento del Target FIRE, con badge prominente dello spostamento in mesi/anni ("+2a 4m" / "-3 mesi"), quattro mini-KPI (FIRE senza, FIRE con, Target, Risparmio usato) e ReferenceLine sull'eta' di raggiungimento FIRE per entrambi gli scenari
- **Pannello "Come abbiamo calcolato"** — sette blocchi accordion espandibili (rata, TCO, DTI, liquidita', costo opportunita', target FIRE, impatto patrimoniale) che mostrano per ogni numero: formula matematica, sostituzione dei valori reali dell'utente, risultato. Cosi' il Consulente smette di essere una black-box e diventa didattico
- **Confronto Scenari Cash / Finanziato / Non comprare** — BarChart comparativo a tre colonne con patrimonio finale, liquidita' dopo l'esborso, interessi pagati e anni al FIRE in ciascuna strategia. Badge "Migliore" sullo scenario vincente e gap in euro per quelli perdenti, cosi' la decisione diventa evidente
- **Sensitivita' del finanziamento** — ComposedChart con toggle Anticipo%/Durata anni che mostra come cambiano TCO, interessi totali e ritardo FIRE al variare di quel parametro. ReferenceDot verde evidenzia la scelta attuale dell'utente, con riassunto testuale sotto al grafico
- **Motore FIRE condiviso (`src/lib/finance/fire-projection.ts`)** — nuova funzione pura `projectFire(params)` deterministica con modificatori di scenario (esborso una tantum, rata ricorrente, costi ongoing) + helper `fireDelayMonths` e `formatDelay`. Riutilizzabile da Consulente e potenzialmente dal tab FIRE, evita la duplicazione dei calcoli
- **Top bar Consulente ampliata** — da 4 a 6 KPI: Patrimonio Netto, Liquidita', Reddito, **Risparmio Reale**, **DTI Attuale** e Debiti/Eta', con sottotitolo descrittivo su ogni card

### 13 aprile 2026 (sync abbonamenti → patrimonio)

- **Abbonamenti sincronizzati nel cashflow patrimonio** — gli abbonamenti inseriti nel Tracker Abbonamenti Ricorrenti vengono ora inclusi automaticamente tra le spese automatiche della sezione Patrimonio (Passivita & Cashflow). Il totale mensile degli abbonamenti si somma a costi immobiliari e rate prestiti, aggiornando in tempo reale il Risparmio Netto Mensile, il Cashflow Atteso e tutti gli indicatori derivati (Indice di Sopravvivenza, proiezione FIRE). Nessuna duplicazione manuale necessaria: basta aggiungere un abbonamento nel tracker e il profilo finanziario si aggiorna da solo al prossimo caricamento

### 13 aprile 2026

- **Abbonamenti ricorrenti persistenti** — il Tracker Abbonamenti ora salva gli abbonamenti nel database (`subscriptionsList` nelle preferenze utente) e li ricarica al login, invece di perderli al refresh della pagina. Il campo e' incluso anche nell'export/import dati JSON, cosi' gli abbonamenti vengono trasferiti tra account e dispositivi
- **File demo `demo-marco-giulia.json`** — file JSON di esempio con dati completi di una coppia (profilo, spese, portafoglio ETF, Bitcoin, beni rifugio, fondo pensione, prestiti, parametri FIRE, simulatore mutuo, obiettivi di risparmio, categorie budget, abbonamenti e 7 snapshot storici). Pronto per essere importato con "Importa dati" dal menu ingranaggio

### 12 aprile 2026 (istruzioni import Directa)

- **Guida "Come scaricare il file da Directa"** — il riquadro iniziale di Importa Movimenti Directa ora mostra i 5 passaggi per ottenere il CSV: accedi a Directa versione Libera, apri la sezione Movimenti, seleziona il periodo temporale dal calendario, clicca sull'icona del file Excel per scaricare il CSV, carica il file nell'app. Cosi' chi non conosce l'interfaccia Directa non deve cercare altrove

### 12 aprile 2026 (budget tracker v2)

- **Budget persistente con categorie personalizzate** — il Budget Mensile non e' piu' un semplice viewer dell'ultimo CSV: categorie, limiti, colore, icona e parole chiave vengono salvati nel database (`budgetCategoriesList` nelle preferenze utente) e sopravvivono al refresh e al cambio dispositivo. Ogni utente configura le proprie categorie con il pannello dedicato (crea, rinomina, cambia limite, elimina, assegna parole chiave per l'auto-categorizzazione)
- **Transazioni salvate con dedupe** — nuova tabella `BudgetTransaction` nel database per persistere le transazioni importate dai CSV bancari. Ogni transazione ha un `hash` univoco (data + descrizione + importo) che impedisce doppi inserimenti: re-importare lo stesso CSV non crea duplicati, importi storici di mesi diversi si accumulano nel tempo. Nuove API `GET/POST/DELETE /api/budget/transactions`, `PATCH /api/budget/transactions/[id]` e `POST /api/budget/transactions/reapply`
- **Auto-categorizzazione con keyword utente** — le parole chiave definite dall'utente per ogni categoria hanno la precedenza sulle regole built-in del parser bank-csv. Al momento dell'import ogni transazione viene assegnata in base alle keyword (match case-insensitive, min 2 caratteri) e l'assegnazione puo' sempre essere corretta manualmente dal drawer transazioni. Nuovo endpoint `reapply` per ricategorizzare tutte le transazioni quando cambi le keyword, preservando gli override manuali
- **Modalita' visualizzazione multiple** — switch tra "Mese corrente" (spesa del singolo mese), "Media mensile" (media su tutti i mesi con transazioni) e "Totale" (somma di tutte le transazioni importate). Persistente come preferenza utente in `budgetSettings`
- **KPI, grafici e alert** — nuova intestazione con KPI cards (speso totale, limite, residuo, % utilizzo), grafico di confronto categorie (spesa vs limite con colori dinamici), grafico trend mensile sulle ultime 6 mensilita', alert per le transazioni non categorizzate ("Altro") con link diretto al drawer per assegnare la categoria corretta
- **Drawer transazioni** — nuovo pannello laterale con elenco completo, filtri per categoria/periodo, possibilita' di cambiare categoria inline (con flag `categoryOverride` per proteggere la scelta dalla ricategorizzazione automatica), eliminare singole transazioni o ripulire tutto. L'intero Budget Tracker e' stato decomposto in 7 sotto-componenti memo (`budget-header`, `budget-kpi-cards`, `uncategorized-alert`, `budget-categories-panel`, `budget-comparison-chart`, `budget-trend-chart`, `transaction-drawer`) orchestrati da `budget-tracker.tsx` e dal nuovo hook `useBudget` che incapsula fetch, import, update e delete

### 12 aprile 2026 (fix variazioni ETF)

- **Fix variazioni ETF errate su ticker duplicati e holding nuove** — nel dettaglio snapshot le holding con ticker duplicato (es. SUSW.MI 2130 e SUSW.MI 825, o lotti diversi dello stesso ISIN) mostravano variazioni assurde perche' il fallback per ticker associava la holding sbagliata nello snapshot passato. Allo stesso modo, holding nuove assenti nel passato apparivano con `+€totale (+0.00%)`. Ora il matching e' strict: si usa `id`; se fallisce, il fallback per ticker si applica solo quando il ticker e' unico in entrambi gli snapshot (current e passato). Negli altri casi la variazione e' "n/d"

### 12 aprile 2026 (variazioni per ETF)

- **Variazioni 1g / 7g / 30g per singolo ETF** — nel pannello espanso del Dettaglio Snapshot, ogni riga della sezione "Dettaglio ETF / Strumenti" ora mostra le variazioni (euro + percentuale, verde/rosso) rispetto a 1, 7 e 30 giorni prima per quel specifico titolo. Il matching avviene per `id` con fallback sul ticker, cosi' segue lo stesso holding anche se il record storico aveva prezzi diversi

### 12 aprile 2026 (dettaglio snapshot)

- **Liquidita ed ETF separati nello storico snapshot** — la tabella Dettaglio Snapshot ora mostra due colonne distinte: "Liquidita" (conto, contante) ed "ETF / Strumenti" (titoli e strumenti finanziari), invece di sommarli in un'unica voce confusa
- **Ordinamento discendente degli snapshot** — lo storico ora mostra sempre gli snapshot dal piu' recente al piu' lontano nel tempo, sia su desktop che su mobile
- **Tendina espandibile con dettaglio completo** — ogni riga/card snapshot puo' essere espansa per mostrare un pannello con tutti i componenti del patrimonio a quella data: breakdown per immobile (da `realEstateList`), breakdown per ticker ETF (da `customStocksList`), liquidita, fondo emergenza, fondo pensione, beni rifugio, bitcoin (quantita x prezzo), debiti totali
- **Variazioni 1g / 7g / 30g per ogni componente** — ogni card del pannello dettaglio mostra le variazioni rispetto a 1, 7 e 30 giorni prima per il singolo componente (non solo il totale): immobili, liquidita, ETF, bitcoin, fondo emergenza, fondo pensione, beni rifugio, debiti e patrimonio netto totale. Ogni badge mostra sia il delta in euro sia la percentuale, colorato verde se positivo / rosso se negativo, con icona trend e data di riferimento
- **Helper `findPastSnapshot`** — trova lo snapshot piu' recente con data <= (target - N giorni), cosi' le variazioni funzionano anche con snapshot non giornalieri (prende il piu' vicino disponibile)

### 12 aprile 2026

- **Proiezione patrimonio con interesse composto** — nuova terza modalita' di proiezione: oltre a "Risparmio Netto" e "Trend Storico", ora disponibile "Risparmio + Rendimento" che combina il risparmio mensile con il rendimento atteso configurato nella sezione FIRE (interesse composto con versamenti periodici)
- **Spiegazioni on-hover** — tutti i testi esplicativi che occupavano spazio nell'interfaccia sono stati convertiti in tooltip: passando il mouse sull'icona info accanto a ogni parametro si legge come viene calcolato, senza ingombrare la vista. Interessa proiezione patrimonio, parametri FIRE (SWR, inflazione, rendimento, volatilita', fondo pensione, bollo, pensione INPS), simulatore mutuo (DTI, cashflow, costo opportunita'), profilo finanziario, strategia debiti e calcolatore interesse composto
- **Componente InfoTooltip riutilizzabile** — nuovo componente UI basato su Radix Tooltip per mostrare spiegazioni contestuali al passaggio del mouse, con icona Info e stile coerente in tutta l'app
- **Fix risparmio netto in proiezione** — la proiezione patrimonio nel Riepilogo ora usa il netIncome salvato dal Profilo Finanziario (single source of truth) invece di ricalcolarlo con una formula diversa che non teneva conto delle rate dinamiche dei prestiti, causando un valore piu' alto del reale

### 11 aprile 2026 (mobile patrimonio)

- **Card Patrimonio piu' chiare su smartphone** - superfici meno trasparenti e meno "annerite" nelle sezioni Patrimonio, Asset, Cashflow e Storico; tab attivo della navigazione Patrimonio ora usa un accento blu invece del blocco scuro
- **Navigazione mobile piu' leggibile** - tab principali, sottotab Asset e scorciatoie overview ottimizzati per viewport strette con testi meno troncati e scorrimento orizzontale dove serve
- **Grafici piu' leggibili da telefono** - migliorati margini, tooltip, tick e legenda mobile dello storico Patrimonio; semplificata anche la simulazione portafoglio per lasciare piu' spazio al grafico
- **Storico e ribilanciamento mobile-friendly** - la tabella snapshot ora mostra card compatte su smartphone e il ribilanciamento ha un layout dedicato mobile invece della griglia compressa da desktop
- **Form debiti e cashflow rifiniti** - card debiti con layout verticale piu' comodo su schermi piccoli, filtri proprietario piu' flessibili e modal prestiti con campi a una colonna su mobile

### 11 aprile 2026 (brand refresh)

- **Logo ufficiale in UI** - nuovo `BrandLogo` con crop dedicato del wordmark per eliminare gli spazi vuoti del PNG e mantenere proporzioni corrette; header principale, onboarding e pagina `/login` ora usano il marchio in modo coerente su desktop e mobile
- **Favicon e icone PWA** - collegate le nuove risorse favicon in Next.js, `manifest.json`, `site.webmanifest`, `favicon.ico` e Service Worker, cosi' browser tab, shortcut mobile e installazione PWA usano lo stesso set di icone
- **Login piu' pulita** - rimosso l'autofocus iniziale del campo username che faceva scorrere subito la viewport e poteva nascondere il logo nelle schermate piu' piccole

### 11 aprile 2026 (pomeriggio)

- **Logo e branding** — nuovo logo grafico con componente `BrandLogo` riutilizzabile; header principale e pagina /login ora usano l'immagine al posto di icona+testo
- **Favicon e icone PWA** — set completo di favicon (SVG, PNG 96x96, ICO) e icone PWA (192x192, 512x512, apple-touch-icon 180x180) nella cartella `/favicon/`; manifest.json e Service Worker aggiornati con le nuove risorse
- **Proiezione patrimonio con regressione lineare** — la proiezione del patrimonio futuro usa ora la regressione ai minimi quadrati su tutti gli snapshot storici invece del semplice delta primo-ultimo punto, dando una stima piu' affidabile e meno sensibile agli outlier
- **Fix cashflow riepilogo** — le spese annuali (assicurazioni, revisione, ecc.) vengono ora divise per 12 nel calcolo del cashflow mensile; gli affitti degli immobili vengono contati come entrata
- **Fix overflow testo navigazione Patrimonio** — i bottoni di navigazione (Panoramica, Asset, Passivita & Cashflow, Storico) ora troncano correttamente il testo che eccedeva i bordi su schermi stretti

### 11 aprile 2026 (tarda notte)

- **Maialino cashflow familiare** — il KPI con il maialino e la percentuale di risparmio nell'header ora naviga direttamente alla sezione Profilo Familiare nel tab Patrimonio (invece che al Budget), dove sono visibili Reddito Lordo Familiare, Totale Spese e Risparmio Mensile Netto; scroll automatico alla sezione
- **Fix calcolo tasso di risparmio** — le spese annuali (assicurazioni, revisioni, ecc.) venivano sommate senza dividere per 12, gonfiando le uscite e mostrando una percentuale errata; ora il calcolo nell'header e' allineato con il Profilo Familiare
- **Colori tasso di risparmio** — rosso sotto il 20%, arancione tra 20% e 35%, verde tra 36% e 50%, verdissimo con razzetto sopra il 50%

### 11 aprile 2026 (notte)

- **Snapshot giornalieri automatici** — nuovo scheduler in background che ogni giorno a mezzanotte aggiorna gli snapshot di tutti gli utenti con prezzi BTC e stock/ETF freschi, cosi' lo storico patrimonio riflette l'andamento reale anche senza aprire l'app per settimane
- **Auto-save al caricamento** — quando l'utente apre il tab Patrimonio, i prezzi BTC e stock vengono aggiornati e lo snapshot del giorno viene salvato automaticamente con i valori live
- **Pagina /login dedicata** — nuova route `/login` con form pulito e centrato per accedere o registrarsi senza passare dal modal della dashboard; redirect automatico se gia' loggati
- **Endpoint cron snapshot** — nuovo endpoint `/api/cron/snapshots` (protetto da CRON_SECRET) per forzare manualmente il refresh degli snapshot di tutti gli utenti

### 11 aprile 2026 (sera)

- **Fondo pensione complementare nel FIRE** — il valore del fondo pensione non viene piu' contato come asset liquido nel calcolo FIRE; ora cresce come pot separato con contributi volontari (max 5.164 €), TFR automatico (~6.91% RAL) e contributo datore di lavoro (% o fisso, configurabile)
- **Modalita' uscita FP** — l'utente sceglie tra "50% capitale + 50% rendita mensile" (max legale) oppure "100% rendita"; la rendita viene sottratta dalle spese dopo l'eta' di accesso
- **Eta' accesso RITA** — campo separato dall'eta' pensione INPS per modellare l'accesso anticipato al fondo pensione (default 62 anni)
- **Tassazione uscita FP** — slider 9%-15% per configurare l'aliquota in base all'anzianita' di partecipazione al fondo
- **Rimborso IRPEF** — il risparmio fiscale sui versamenti volontari viene reinvestito automaticamente a luglio nella simulazione
- **Coerenza simulazioni** — tutte e 3 le simulazioni (deterministica, Monte Carlo 10k runs, stress test Lost Decade) aggiornate con il modello a doppio pot
- **Persistenza** — tutti i parametri del fondo pensione (ottimizzatore, RAL, contributi, RITA, tassazione, modalita' uscita, contributo datore) vengono ora salvati nel database e sopravvivono al refresh

### 11 aprile 2026

- **Controvalore manuale per ticker non trovati** — se un ticker azione/ETF non viene trovato sui mercati, ora e' possibile cliccare sul "?" per inserire manualmente il controvalore in euro; il valore manuale ha la precedenza su prezzo*quote in tutti i calcoli (patrimonio, snapshot, totali). Toast informativo a scomparsa mostrato una sola volta per sessione.

### 10 aprile 2026 (notte)

- **Esporta / Importa dati** — nuovo menu ingranaggio accanto al nome utente con possibilita' di esportare tutta la situazione finanziaria (preferenze, snapshot patrimonio, obiettivi) in un file JSON e reimportarla su un altro account o dispositivo

### 10 aprile 2026 (sera)

- **Proprietario per asset** — ogni investimento (azioni/ETF), immobile, altro asset (Bitcoin, beni rifugio, TFR) e debito puo' ora essere assegnato a Persona 1 o Persona 2 con badge colorato e totale parziale per ciascuno
- **Filtro per persona** — barra filtro "Tutti / Persona 1 / Persona 2" nelle sezioni Investimenti, Immobili e Passivita con subtotali dinamici
- **Altri asset per persona** — Bitcoin, beni rifugio e fondo pensione hanno ora due campi affiancati (uno per persona) con totale combinato
- **Intestatario debiti** — il modal di creazione/modifica prestito include il campo Intestatario; i debiti sono filtrabili per persona nella sezione Passivita

### 10 aprile 2026

- **Analisi rendimenti avanzata** — ogni strumento nella classifica investimenti mostra ora il rendimento MWR (Money-Weighted Return / XIRR annualizzato), il rendimento semplice, il rendimento annualizzato, la durata dell'investimento e la contribuzione percentuale al P/L totale del portafoglio
- **XIRR di portafoglio** — nuovo KPI che mostra il rendimento annualizzato complessivo di tutte le posizioni chiuse, ponderato per i flussi di cassa reali
- **Tutti gli strumenti visibili** — la tabella dettaglio per strumento mostra ora tutti i ticker senza limiti, con riepilogo guadagni/perdite totali

### 9 aprile 2026

- **Viewer Movimenti Directa** — nuovo strumento nella sezione Strumenti per importare il CSV scaricato da Directa Trading. Analisi completa con 8 KPI, grafico cumulativo (conferimenti, investito, dividendi), flussi mensili, distribuzione operazioni, riepilogo annuale, dettaglio per strumento e tabella movimenti con filtri per anno, ticker, categoria e ricerca testuale. Solo visualizzazione client-side, nessun dato salvato
- **Sezione "Strumenti"** — la sezione Calcolatori e' stata rinominata Strumenti per raccogliere calcolatori finanziari e il nuovo viewer Directa
- **Patrimonio rinnovato** — snapshot piu' ricchi con liquidita' distinta dal valore titoli, storico migliorato ed export CSV aggiornato
- **Sezione Carriera evoluta** — simulazioni di crescita professionale e nuovo calcolatore lordo-netto integrato nella dashboard con IRPEF, INPS, detrazioni e addizionali
- **Cronologia stipendio** — ogni simulazione dello stipendio netto puo' essere salvata, ricaricata o eliminata; persiste sull'account o sul dispositivo in modalita' guest

### 8 aprile 2026

- **Lancio Effetto Composto** — prima release pubblica su [effettocomposto.it](https://effettocomposto.it) con 8 sezioni: Riepilogo, Patrimonio, Carriera, Consulente Acquisti, Immobiliare, FIRE, Budget e Calcolatori
- **Simulatore Mutuo** — calcolo rata con ammortamento francese, confronto fino a 3 mutui side-by-side, analisi DTI e analisi redditivita' acquisto vs affitto
- **Calcolatore FIRE** — 10.000 simulazioni Monte Carlo via Web Worker con proiezione patrimonio e probabilita' di successo per anno target
- **Tracker Patrimonio** — snapshot giornalieri del patrimonio netto, gestione immobili, portafoglio titoli con dividendi, prestiti attivi, proiezione futura e storico esportabile in CSV
- **Budget e Abbonamenti** — spese per categoria con import CSV (Fineco, Intesa, generico), tracker abbonamenti ricorrenti, obiettivi di risparmio e strategia debiti (snowball vs avalanche)
- **Mutui Market** — confronto offerte mutui in tempo reale da MutuiSupermarket.it con aggiornamento automatico giornaliero, filtri per tipo tasso e durata, ricalcolo rata personalizzato
- **Proiezione patrimonio** — stima dell'evoluzione futura del patrimonio anche senza storico, basata su patrimonio attuale e risparmio mensile
- **PWA installabile** — funziona come app su smartphone, supporto offline con Service Worker
- **Sicurezza** — autenticazione JWT, password bcrypt 12 rounds, rate limiting, HTTPS con HSTS, validazione input con Zod, security headers completi
- **Dark mode e responsive** — interfaccia ottimizzata per mobile e desktop con tema chiaro e scuro

---

## Avvio Rapido

```bash
# 1. Clona il repository
git clone https://github.com/iSte94/EffettoComposto.git
cd EffettoComposto

# 2. Installa le dipendenze
npm install

# 3. Configura l'ambiente
cp .env.example .env

# 4. Inizializza il database
npx prisma generate
npx prisma db push

# 5. Avvia il dev server
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

### Comandi

| Comando | Descrizione |
|---|---|
| `npm run dev` | Dev server con hot reload |
| `npm run build` | Build di produzione |
| `npm run lint` | Linting con ESLint |
| `npm test` | Esegui i test (una volta) |
| `npm run test:watch` | Test in watch mode |
| `npx prisma studio` | GUI per esplorare il database |

### Variabili d'Ambiente

| Variabile | Descrizione | Obbligatoria |
|---|---|---|
| `DATABASE_URL` | Path al database SQLite | Si |
| `JWT_SECRET` | Secret per i token di autenticazione JWT | In produzione |
| `NODE_ENV` | `development` o `production` | No |

---

## Sicurezza e Privacy

**I tuoi dati sono solo tuoi.** Effetto Composto e' progettato con la privacy al centro:

- **Nessun tracking, nessuna analytics, nessun cookie di terze parti** — zero dati inviati a servizi esterni
- **Database locale** — tutti i dati finanziari restano nel database SQLite sul server, mai condivisi
- **Nessuna email richiesta** — la registrazione usa solo username e password, niente dati personali
- **Codice open-source** — chiunque puo' verificare esattamente cosa fa l'applicazione

### Protezione dei dati

| Misura | Dettaglio |
|---|---|
| **Password** | Hash con bcrypt (12 rounds, irreversibile). La password in chiaro non viene mai salvata |
| **Autenticazione** | Token JWT firmati con HMAC-SHA256, durata 24h, cookie HttpOnly + Secure + SameSite=Strict |
| **Brute-force** | Rate limiting: max 5 tentativi ogni 15 minuti per IP |
| **Trasporto** | HTTPS obbligatorio con TLS 1.2+ (Let's Encrypt), HSTS preload attivo |
| **Headers** | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy |
| **Validazione** | Ogni input API validato con Zod schema prima dell'elaborazione |
| **API protette** | Tutte le route dati richiedono autenticazione JWT valida |

### Cosa NON facciamo

- Non raccogliamo email, numeri di telefono o dati identificativi
- Non vendiamo, condividiamo o analizziamo i dati degli utenti
- Non usiamo Google Analytics, Facebook Pixel o altri tracker
- Non inviamo i dati finanziari a servizi di terze parti
- Le uniche chiamate esterne sono per i prezzi di mercato (Yahoo Finance, Binance) e non contengono dati utente

---

## Contribuire

I contributi sono benvenuti! Apri una issue per segnalare bug o proporre nuove funzionalita', oppure invia una pull request.

1. Forka il repository
2. Crea un branch (`git checkout -b feature/nuova-funzionalita`)
3. Committa le modifiche (`git commit -m 'feat: aggiungi nuova funzionalita'`)
4. Pusha il branch (`git push origin feature/nuova-funzionalita`)
5. Apri una Pull Request

---

## Licenza

Distribuito con licenza [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Libero per uso personale e non commerciale.

---

<div align="center">

**[effettocomposto.it](https://effettocomposto.it)**

</div>
