-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyPrice" REAL NOT NULL DEFAULT 300000,
    "downpayment" REAL NOT NULL DEFAULT 60000,
    "purchaseTaxes" REAL NOT NULL DEFAULT 6000,
    "notaryFees" REAL NOT NULL DEFAULT 3000,
    "agencyFees" REAL NOT NULL DEFAULT 9000,
    "netIncome" REAL NOT NULL DEFAULT 4000,
    "person1Name" TEXT NOT NULL DEFAULT 'Persona 1',
    "person1Income" REAL NOT NULL DEFAULT 2000,
    "person2Name" TEXT NOT NULL DEFAULT 'Persona 2',
    "person2Income" REAL NOT NULL DEFAULT 2000,
    "expensesList" TEXT NOT NULL DEFAULT '[]',
    "hasExistingLoan" BOOLEAN NOT NULL DEFAULT false,
    "knowsExistingInstallment" BOOLEAN NOT NULL DEFAULT true,
    "existingInstallment" REAL NOT NULL DEFAULT 0,
    "existingRemainingCapital" REAL NOT NULL DEFAULT 15000,
    "existingRate" REAL NOT NULL DEFAULT 6.5,
    "existingYearsLeft" REAL NOT NULL DEFAULT 5,
    "rate" REAL NOT NULL DEFAULT 3.5,
    "years" REAL NOT NULL DEFAULT 30,
    "expectedRent" REAL NOT NULL DEFAULT 1200,
    "maintenanceTaxes" REAL NOT NULL DEFAULT 300,
    "marketReturn" REAL NOT NULL DEFAULT 7,
    "vacancyRate" REAL NOT NULL DEFAULT 5,
    "rentInflation" REAL NOT NULL DEFAULT 1.5,
    "extraMaintenance" REAL NOT NULL DEFAULT 10000,
    "realEstateList" TEXT NOT NULL DEFAULT '[]',
    "existingLoansList" TEXT NOT NULL DEFAULT '[]',
    "customStocksList" TEXT NOT NULL DEFAULT '[]',
    "acceptedPurchases" TEXT NOT NULL DEFAULT '[]',
    "careerProgression" TEXT NOT NULL DEFAULT '[]',
    "birthYear" INTEGER,
    "retirementAge" INTEGER,
    "expectedMonthlyExpenses" REAL,
    "fireWithdrawalRate" REAL NOT NULL DEFAULT 3.25,
    "fireExpectedReturn" REAL NOT NULL DEFAULT 6.0,
    "fireVolatility" REAL NOT NULL DEFAULT 15.0,
    "expectedPublicPension" REAL NOT NULL DEFAULT 0,
    "publicPensionAge" INTEGER NOT NULL DEFAULT 67,
    "applyTaxStamp" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "realEstateValue" REAL NOT NULL DEFAULT 0,
    "realEstateCosts" REAL NOT NULL DEFAULT 0,
    "realEstateRent" REAL NOT NULL DEFAULT 0,
    "realEstateList" TEXT NOT NULL DEFAULT '[]',
    "liquidStockValue" REAL NOT NULL DEFAULT 0,
    "customStocksList" TEXT NOT NULL DEFAULT '[]',
    "safeHavens" REAL NOT NULL DEFAULT 0,
    "emergencyFund" REAL NOT NULL DEFAULT 0,
    "pensionFund" REAL NOT NULL DEFAULT 0,
    "bitcoinAmount" REAL NOT NULL DEFAULT 0,
    "bitcoinPrice" REAL NOT NULL DEFAULT 0,
    "debtsTotal" REAL NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    CONSTRAINT "AssetRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavingsGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL DEFAULT 0,
    "deadline" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "SavingsGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockHistoryCache" (
    "ticker" TEXT NOT NULL PRIMARY KEY,
    "history" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Preference_userId_key" ON "Preference"("userId");

-- CreateIndex
CREATE INDEX "AssetRecord_userId_date_idx" ON "AssetRecord"("userId", "date");

-- CreateIndex
CREATE INDEX "SavingsGoal_userId_idx" ON "SavingsGoal"("userId");
