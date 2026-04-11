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

---

*Simulatore mutuo, calcolatore FIRE, tracker patrimonio, carriera, stipendio netto, budget e molto altro.*
*Tutto in italiano. Tutto gratuito. Tutto open-source.*

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

## Changelog

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
