ALTER TABLE "Preference" ADD COLUMN "preRetirementPassiveIncomeMode" TEXT NOT NULL DEFAULT 'percent';
ALTER TABLE "Preference" ADD COLUMN "preRetirementPassiveIncomeSavingsPct" REAL NOT NULL DEFAULT 100;
ALTER TABLE "Preference" ADD COLUMN "preRetirementPassiveIncomeSavingsAnnual" REAL NOT NULL DEFAULT 0;
