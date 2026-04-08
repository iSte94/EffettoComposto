# Effetto Composto - Pianifica la tua indipendenza finanziaria

## Comandi Sviluppo

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Build produzione
npm run lint     # ESLint
npm test         # Vitest unit tests (run once)
npm run test:watch  # Vitest in watch mode
npx prisma studio  # DB browser GUI
npx prisma db push # Applica schema al DB
```

## Architettura

- **Next.js 16** (App Router) con React 19, TypeScript, Tailwind CSS 4
- **Prisma + SQLite** per persistenza (schema in `prisma/schema.prisma`)
- **Shadcn/UI** (stile new-york) per componenti UI
- **Recharts** per grafici, **Framer Motion** per animazioni
- **Web Workers** per calcoli pesanti (Monte Carlo)
- **PWA** con Service Worker (cache-first statico, network-first API)
- **Vitest** per unit test, **GitHub Actions** per CI
- **React.memo** su sotto-componenti estratti per evitare re-render inutili
- **Lazy loading** (React.lazy + Suspense) per tutti i 7 tab

## Struttura Principale

```
src/
  app/
    page.tsx              # Shell con 6 tab + dropdown "Strumenti" (AuthContext + lazy loading)
    error.tsx             # Error boundary globale
    loading.tsx           # Loading state globale
    api/
      auth/               # Login, Register, Session (JWT + bcrypt + rate limiting)
      preferences/        # Salvataggio preferenze utente (Zod validated)
      patrimonio/         # CRUD snapshot patrimonio (Zod validated)
      finance/            # Calcoli mutuo e FIRE server-side
      stocks/             # Yahoo Finance + Stooq fallback + dividendi
      bitcoin/            # Prezzo BTC da Binance
      mutui-market/       # GET (cache) + POST (force scrape) offerte mutui
      cron/mutui-market/  # Endpoint cron giornaliero (protetto da CRON_SECRET)
      goals/              # CRUD obiettivi di risparmio (Zod validated)
  components/
    mortgage-simulator/   # Tab Simulatore Mutuo (decomposto)
      index.tsx           # Orchestratore con calcoli derivati
      mortgage-inputs.tsx # Input proprieta', mutuo, affitto
      dti-analysis.tsx    # Pannello DTI rata/reddito
      profitability-analysis.tsx # Confronto investimento
      mortgage-comparison.tsx   # Confronto mutui side-by-side
    patrimonio/              # Componenti estratti dal patrimonio (tutti memo)
      net-worth-chart.tsx    # Grafico storico patrimonio
      loan-manager-modal.tsx # Modal CRUD prestiti
      bank-import-modal.tsx  # Import CSV estratto conto
      net-worth-projection.tsx # Proiezione lineare patrimonio futuro
      financial-profile.tsx  # Sezione reddito/spese
      real-estate-section.tsx # CRUD immobili
      stock-portfolio-section.tsx # Portafoglio titoli + dividendi
      snapshot-history-table.tsx  # Tabella snapshot storici
      portfolio-rebalance.tsx     # Suggerimenti ribilanciamento
    fire/                    # Componenti estratti dal FIRE (memo)
      fire-settings-panel.tsx # Parametri personali e variabili mercato
    advisor/                 # Componenti estratti dall'advisor (memo)
      purchase-form.tsx      # Form input acquisto
      advice-panel.tsx       # Pannello risultati e consigli
    mutui-market/            # Mutui Market (scraping MutuiSupermarket.it)
      index.tsx              # Cards offerte con filtri e ricalcolo rata
    patrimonio-dashboard.tsx  # Tab Patrimonio (orchestratore ~830 righe)
    fire-dashboard.tsx        # Tab FIRE (Monte Carlo via Worker ~885 righe)
    advisor-dashboard.tsx     # Tab Advisor (acquisti ~480 righe)
    overview-dashboard.tsx    # Tab Riepilogo (KPI + asset allocation + budget)
    real-estate-analysis.tsx   # Toggle 3 sezioni: Mutuo / Rendita / Market
    savings-goals.tsx         # Tracking obiettivi di risparmio
    inflation-calculator.tsx  # Tab Calcolatore Inflazione
    compound-interest-calculator.tsx # Tab Calcolatore Interesse Composto
    budget-tracker.tsx        # Budget mensile per categoria con import CSV
    subscription-tracker.tsx  # Tracker abbonamenti ricorrenti
    debt-strategy.tsx         # Confronto snowball vs avalanche
    financial-alerts.tsx      # Alert automatici (DTI, fondo emergenza, FIRE)
    welcome-onboarding.tsx    # Onboarding per utenti non autenticati
    sw-register.tsx           # Registrazione Service Worker PWA
  contexts/
    auth-context.tsx      # AuthProvider + useAuth() hook
  hooks/
    usePreferences.ts     # Load/save preferenze con auto-save debounce
  workers/
    monte-carlo.worker.ts # Simulazione 10k runs off main thread
  instrumentation.ts      # Hook avvio server (scheduler Mutui Market)
  lib/
    auth.ts               # JWT sign/verify (lazy secret evaluation)
    api-auth.ts           # Helper auth per API routes
    prisma.ts             # Prisma client singleton
    rate-limit.ts         # Rate limiter in-memory (15min window, 10 max)
    format.ts             # Formattazione (formatEuro, formatPercent)
    constants.ts          # Costanti condivise (tassi cambio fallback, soglie DTI)
    fx-rates.ts           # Tassi cambio dinamici (Frankfurter API, cache 4h)
    mutui-market/
      types.ts            # Tipi offerte mutuo (MortgageOffer, ScraperParams)
      scraper.ts          # Scraping API MutuiSupermarket + cache DB
      scheduler.ts        # Scheduler in-process (ogni giorno alle 21:00)
    finance/
      loans.ts            # Ammortamento francese, calcolo rate
      irpef.ts            # Scaglioni IRPEF 2024/2025
    validations/          # Zod schemas per API
      auth.ts             # Login/register (min 8 char password)
      preferences.ts      # Tutti i campi preferenze
      patrimonio.ts       # Asset record + delete
    export/
      csv.ts              # Export CSV con BOM UTF-8 (patrimonio, ammortamento)
    import/
      bank-csv.ts         # Parser CSV bancari (Fineco, Intesa, generico)
  types/
    index.ts              # Tipi condivisi (AssetRecord, RealEstateProperty, CustomStock con dividendi, etc.)
```

## Convenzioni

- Lingua UI: Italiano
- Formattazione valuta: `formatEuro()` da `@/lib/format`
- Tipi condivisi: importare da `@/types`
- Auth API routes: usare `getAuthenticatedUserId()` da `@/lib/api-auth`
- Validazione input API: Zod schemas in `src/lib/validations/`
- Auth context: usare `useAuth()` da `@/contexts/auth-context`
- Preferenze mutuo: usare `usePreferences()` da `@/hooks/usePreferences`
- Sotto-componenti estratti: wrappare con `React.memo` per performance
- Tassi cambio: usare `getFxRates()` da `@/lib/fx-rates` (non hardcoded)
- Path alias: `@/*` mappa a `./src/*`

## Database

SQLite locale in `prisma/dev.db`. Modelli principali:
- **User** - autenticazione
- **Preference** - tutte le impostazioni utente (1:1 con User)
- **AssetRecord** - snapshot giornalieri patrimonio (1:N con User)
- **SavingsGoal** - obiettivi di risparmio (1:N con User)
- **StockHistoryCache** - cache prezzi storici (24h TTL)
- **MortgageMarketCache** - cache offerte mutui (scraping giornaliero, unique su tipoTasso+durata)

## Environment Variables

Vedi `.env.example` per le variabili necessarie.
- `JWT_SECRET` — OBBLIGATORIO in produzione
- `CRON_SECRET` — Protegge l'endpoint cron manuale (opzionale)
