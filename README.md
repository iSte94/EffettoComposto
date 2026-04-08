# Effetto Composto

Strumenti gratuiti e open-source per pianificare la tua **indipendenza finanziaria**.

Simulatore mutuo, calcolatore FIRE, tracker patrimonio, budget mensile e molto altro. Tutto in italiano, tutto in un'unica webapp.

**[effettocomposto.it](https://effettocomposto.it)**

## Funzionalita'

- **Simulatore Mutuo** — Calcolo rata, ammortamento francese, confronto mutui, analisi DTI
- **Calcolatore FIRE** — Monte Carlo (10.000 simulazioni via Web Worker), proiezione patrimonio
- **Tracker Patrimonio** — Snapshot giornalieri, immobili, portafoglio titoli con dividendi, prestiti
- **Budget & Spese** — Budget mensile per categoria, import CSV estratto conto (Fineco, Intesa)
- **Obiettivi di Risparmio** — Tracking progressi verso obiettivi personalizzati
- **Abbonamenti** — Tracker costi ricorrenti con totale mensile/annuale
- **Strategia Debiti** — Confronto snowball vs avalanche
- **Calcolatore Inflazione** — Impatto dell'inflazione sul potere d'acquisto
- **Interesse Composto** — Simulazione crescita capitale nel tempo
- **Advisor Acquisti** — Analisi impatto acquisti sul percorso FIRE
- **Riepilogo** — KPI, asset allocation, alert automatici (DTI, fondo emergenza, FIRE)

## Tech Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + Shadcn/UI
- **Prisma + SQLite** per la persistenza
- **Recharts** per i grafici
- **Framer Motion** per le animazioni
- **Web Workers** per calcoli pesanti (Monte Carlo)
- **PWA** con Service Worker (installabile su mobile)
- **Vitest** per i test

## Sviluppo locale

```bash
# Installa dipendenze
npm install

# Genera Prisma client e applica schema
npx prisma generate
npx prisma db push

# Avvia il dev server
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

### Comandi utili

```bash
npm run dev          # Dev server
npm run build        # Build produzione
npm run lint         # ESLint
npm test             # Test (run once)
npm run test:watch   # Test in watch mode
npx prisma studio    # GUI database
```

### Variabili d'ambiente

Copia `.env.example` in `.env`:

```bash
cp .env.example .env
```

| Variabile      | Descrizione                          | Obbligatoria |
| -------------- | ------------------------------------ | ------------ |
| `DATABASE_URL` | Path al database SQLite              | Si           |
| `JWT_SECRET`   | Secret per i token JWT               | In produzione|
| `NODE_ENV`     | `development` / `production`         | No           |

## Deploy

Il progetto e' pensato per girare su un VPS con Docker e Traefik. Vedi [DEPLOY.md](DEPLOY.md) per la guida completa.

## Licenza

MIT
