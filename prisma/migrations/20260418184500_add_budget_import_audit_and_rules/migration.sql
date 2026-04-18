-- CreateTable
CREATE TABLE "BudgetImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "threadId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'telegram',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "title" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceFiles" TEXT NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "insertedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "totalIncome" REAL NOT NULL DEFAULT 0,
    "totalExpenses" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "cancelledAt" DATETIME,
    "rolledBackAt" DATETIME,
    CONSTRAINT "BudgetImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetImportBatch_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AssistantThread" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BudgetMerchantRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "normalizedMerchant" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'categorize',
    "alias" TEXT,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME,
    CONSTRAINT "BudgetMerchantRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BudgetTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "categoryOverride" BOOLEAN NOT NULL DEFAULT false,
    "hash" TEXT NOT NULL,
    "merchantNormalized" TEXT,
    "movementType" TEXT NOT NULL DEFAULT 'standard',
    "importConfidence" TEXT,
    "importBatchId" TEXT,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "BudgetTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BudgetTransaction_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "BudgetImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BudgetTransaction" (
    "amount",
    "category",
    "categoryOverride",
    "date",
    "description",
    "hash",
    "id",
    "importedAt",
    "userId"
)
SELECT
    "amount",
    "category",
    "categoryOverride",
    "date",
    "description",
    "hash",
    "id",
    "importedAt",
    "userId"
FROM "BudgetTransaction";
DROP TABLE "BudgetTransaction";
ALTER TABLE "new_BudgetTransaction" RENAME TO "BudgetTransaction";
CREATE UNIQUE INDEX "BudgetTransaction_userId_hash_key" ON "BudgetTransaction"("userId", "hash");
CREATE INDEX "BudgetTransaction_userId_date_idx" ON "BudgetTransaction"("userId", "date");
CREATE INDEX "BudgetTransaction_userId_merchantNormalized_idx" ON "BudgetTransaction"("userId", "merchantNormalized");
CREATE INDEX "BudgetTransaction_importBatchId_idx" ON "BudgetTransaction"("importBatchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BudgetImportBatch_userId_status_confirmedAt_idx" ON "BudgetImportBatch"("userId", "status", "confirmedAt");

-- CreateIndex
CREATE INDEX "BudgetImportBatch_threadId_createdAt_idx" ON "BudgetImportBatch"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetMerchantRule_userId_normalizedMerchant_mode_key" ON "BudgetMerchantRule"("userId", "normalizedMerchant", "mode");

-- CreateIndex
CREATE INDEX "BudgetMerchantRule_userId_mode_updatedAt_idx" ON "BudgetMerchantRule"("userId", "mode", "updatedAt");
