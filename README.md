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

*Simulatore mutuo, calcolatore FIRE, tracker patrimonio, budget e molto altro.*
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
| **Advisor Acquisti** | Analisi dell'impatto di un acquisto sul percorso FIRE con grafici comparativi |

### Monitoraggio e Gestione

| Strumento | Descrizione |
|---|---|
| **Tracker Patrimonio** | Snapshot giornalieri del patrimonio netto, gestione immobili, portafoglio titoli con dividendi, prestiti attivi, proiezione futura |
| **Budget Mensile** | Spese per categoria, import CSV estratto conto (Fineco, Intesa, formato generico) |
| **Obiettivi di Risparmio** | Target personalizzati con tracking progressi e deadline |
| **Tracker Abbonamenti** | Costi ricorrenti con riepilogo mensile e annuale |
| **Strategia Debiti** | Confronto metodo snowball vs avalanche per l'estinzione dei debiti |

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
