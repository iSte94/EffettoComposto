-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AssetRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "realEstateValue" REAL NOT NULL DEFAULT 0,
    "realEstateCosts" REAL NOT NULL DEFAULT 0,
    "realEstateRent" REAL NOT NULL DEFAULT 0,
    "realEstateList" TEXT NOT NULL DEFAULT '[]',
    "liquidStockValue" REAL NOT NULL DEFAULT 0,
    "stocksSnapshotValue" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_AssetRecord" ("bitcoinAmount", "bitcoinPrice", "customStocksList", "date", "debtsTotal", "emergencyFund", "id", "liquidStockValue", "pensionFund", "realEstateCosts", "realEstateList", "realEstateRent", "realEstateValue", "safeHavens", "userId") SELECT "bitcoinAmount", "bitcoinPrice", "customStocksList", "date", "debtsTotal", "emergencyFund", "id", "liquidStockValue", "pensionFund", "realEstateCosts", "realEstateList", "realEstateRent", "realEstateValue", "safeHavens", "userId" FROM "AssetRecord";
DROP TABLE "AssetRecord";
ALTER TABLE "new_AssetRecord" RENAME TO "AssetRecord";
CREATE INDEX "AssetRecord_userId_date_idx" ON "AssetRecord"("userId", "date");
CREATE TABLE "new_Preference" (
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
    "salaryCalculationHistory" TEXT NOT NULL DEFAULT '[]',
    "birthYear" INTEGER,
    "retirementAge" INTEGER,
    "expectedMonthlyExpenses" REAL,
    "fireWithdrawalRate" REAL NOT NULL DEFAULT 3.25,
    "fireExpectedReturn" REAL NOT NULL DEFAULT 6.0,
    "fireVolatility" REAL NOT NULL DEFAULT 15.0,
    "expectedPublicPension" REAL NOT NULL DEFAULT 0,
    "publicPensionAge" INTEGER NOT NULL DEFAULT 67,
    "applyTaxStamp" BOOLEAN NOT NULL DEFAULT true,
    "separateEmergencyFund" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Preference" ("acceptedPurchases", "agencyFees", "applyTaxStamp", "birthYear", "careerProgression", "customStocksList", "downpayment", "existingInstallment", "existingLoansList", "existingRate", "existingRemainingCapital", "existingYearsLeft", "expectedMonthlyExpenses", "expectedPublicPension", "expectedRent", "expensesList", "extraMaintenance", "fireExpectedReturn", "fireVolatility", "fireWithdrawalRate", "hasExistingLoan", "id", "knowsExistingInstallment", "maintenanceTaxes", "marketReturn", "netIncome", "notaryFees", "person1Income", "person1Name", "person2Income", "person2Name", "propertyPrice", "publicPensionAge", "purchaseTaxes", "rate", "realEstateList", "rentInflation", "retirementAge", "userId", "vacancyRate", "years") SELECT "acceptedPurchases", "agencyFees", "applyTaxStamp", "birthYear", "careerProgression", "customStocksList", "downpayment", "existingInstallment", "existingLoansList", "existingRate", "existingRemainingCapital", "existingYearsLeft", "expectedMonthlyExpenses", "expectedPublicPension", "expectedRent", "expensesList", "extraMaintenance", "fireExpectedReturn", "fireVolatility", "fireWithdrawalRate", "hasExistingLoan", "id", "knowsExistingInstallment", "maintenanceTaxes", "marketReturn", "netIncome", "notaryFees", "person1Income", "person1Name", "person2Income", "person2Name", "propertyPrice", "publicPensionAge", "purchaseTaxes", "rate", "realEstateList", "rentInflation", "retirementAge", "userId", "vacancyRate", "years" FROM "Preference";
DROP TABLE "Preference";
ALTER TABLE "new_Preference" RENAME TO "Preference";
CREATE UNIQUE INDEX "Preference_userId_key" ON "Preference"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
