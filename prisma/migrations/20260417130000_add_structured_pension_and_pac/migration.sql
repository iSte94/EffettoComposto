ALTER TABLE "Preference" ADD COLUMN "monthlyPacBudget" REAL NOT NULL DEFAULT 1000;
ALTER TABLE "Preference" ADD COLUMN "pensionConfig" TEXT NOT NULL DEFAULT '{}';

CREATE TABLE "AssetPacSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "assetTicker" TEXT NOT NULL,
    "amountEur" REAL NOT NULL,
    "cadence" TEXT NOT NULL,
    "timingConfig" TEXT NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetPacSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AssetPacExecution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "assetTicker" TEXT NOT NULL,
    "executionDate" TEXT NOT NULL,
    "priceUsed" REAL,
    "sharesBought" REAL NOT NULL DEFAULT 0,
    "amountEur" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetPacExecution_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "AssetPacSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetPacExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PensionFundAccrual" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "personKey" TEXT NOT NULL,
    "accrualMonth" TEXT NOT NULL,
    "voluntaryAmount" REAL NOT NULL DEFAULT 0,
    "employerAmount" REAL NOT NULL DEFAULT 0,
    "tfrAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "appliedDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PensionFundAccrual_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AssetPacSchedule_userId_assetKey_idx" ON "AssetPacSchedule"("userId", "assetKey");
CREATE INDEX "AssetPacSchedule_userId_active_idx" ON "AssetPacSchedule"("userId", "active");
CREATE INDEX "AssetPacExecution_userId_executionDate_idx" ON "AssetPacExecution"("userId", "executionDate");
CREATE INDEX "AssetPacExecution_assetKey_idx" ON "AssetPacExecution"("assetKey");
CREATE INDEX "PensionFundAccrual_userId_accrualMonth_idx" ON "PensionFundAccrual"("userId", "accrualMonth");

CREATE UNIQUE INDEX "AssetPacExecution_scheduleId_executionDate_key" ON "AssetPacExecution"("scheduleId", "executionDate");
CREATE UNIQUE INDEX "PensionFundAccrual_userId_personKey_accrualMonth_key" ON "PensionFundAccrual"("userId", "personKey", "accrualMonth");
