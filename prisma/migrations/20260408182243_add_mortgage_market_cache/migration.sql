-- CreateTable
CREATE TABLE "MortgageMarketCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipoTasso" TEXT NOT NULL,
    "durata" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "MortgageMarketCache_scrapedAt_idx" ON "MortgageMarketCache"("scrapedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MortgageMarketCache_tipoTasso_durata_key" ON "MortgageMarketCache"("tipoTasso", "durata");
