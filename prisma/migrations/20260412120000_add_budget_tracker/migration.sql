-- CreateTable
CREATE TABLE "BudgetTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "categoryOverride" BOOLEAN NOT NULL DEFAULT false,
    "hash" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "BudgetTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "enablePensionOptimizer" BOOLEAN NOT NULL DEFAULT false,
    "grossIncome" REAL NOT NULL DEFAULT 35000,
    "pensionContribution" REAL NOT NULL DEFAULT 5164,
    "pensionFundAccessAge" INTEGER NOT NULL DEFAULT 62,
    "pensionFundExitTaxRate" REAL NOT NULL DEFAULT 15,
    "pensionExitMode" TEXT NOT NULL DEFAULT 'hybrid',
    "employerContributionType" TEXT NOT NULL DEFAULT 'percent',
    "employerContributionValue" REAL NOT NULL DEFAULT 1.5,
    "budgetCategoriesList" TEXT NOT NULL DEFAULT '[]',
    "budgetSettings" TEXT NOT NULL DEFAULT '{}',
    "userId" TEXT NOT NULL,
    CONSTRAINT "Preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Preference" ("acceptedPurchases", "agencyFees", "applyTaxStamp", "birthYear", "careerProgression", "customStocksList", "downpayment", "employerContributionType", "employerContributionValue", "enablePensionOptimizer", "existingInstallment", "existingLoansList", "existingRate", "existingRemainingCapital", "existingYearsLeft", "expectedMonthlyExpenses", "expectedPublicPension", "expectedRent", "expensesList", "extraMaintenance", "fireExpectedReturn", "fireVolatility", "fireWithdrawalRate", "grossIncome", "hasExistingLoan", "id", "knowsExistingInstallment", "maintenanceTaxes", "marketReturn", "netIncome", "notaryFees", "pensionContribution", "pensionExitMode", "pensionFundAccessAge", "pensionFundExitTaxRate", "person1Income", "person1Name", "person2Income", "person2Name", "propertyPrice", "publicPensionAge", "purchaseTaxes", "rate", "realEstateList", "rentInflation", "retirementAge", "salaryCalculationHistory", "separateEmergencyFund", "userId", "vacancyRate", "years") SELECT "acceptedPurchases", "agencyFees", "applyTaxStamp", "birthYear", "careerProgression", "customStocksList", "downpayment", "employerContributionType", "employerContributionValue", "enablePensionOptimizer", "existingInstallment", "existingLoansList", "existingRate", "existingRemainingCapital", "existingYearsLeft", "expectedMonthlyExpenses", "expectedPublicPension", "expectedRent", "expensesList", "extraMaintenance", "fireExpectedReturn", "fireVolatility", "fireWithdrawalRate", "grossIncome", "hasExistingLoan", "id", "knowsExistingInstallment", "maintenanceTaxes", "marketReturn", "netIncome", "notaryFees", "pensionContribution", "pensionExitMode", "pensionFundAccessAge", "pensionFundExitTaxRate", "person1Income", "person1Name", "person2Income", "person2Name", "propertyPrice", "publicPensionAge", "purchaseTaxes", "rate", "realEstateList", "rentInflation", "retirementAge", "salaryCalculationHistory", "separateEmergencyFund", "userId", "vacancyRate", "years" FROM "Preference";
DROP TABLE "Preference";
ALTER TABLE "new_Preference" RENAME TO "Preference";
CREATE UNIQUE INDEX "Preference_userId_key" ON "Preference"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "BudgetTransaction_userId_date_idx" ON "BudgetTransaction"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetTransaction_userId_hash_key" ON "BudgetTransaction"("userId", "hash");

