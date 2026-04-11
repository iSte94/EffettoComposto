-- AlterTable
ALTER TABLE "Preference" ADD COLUMN "enablePensionOptimizer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Preference" ADD COLUMN "grossIncome" REAL NOT NULL DEFAULT 35000;
ALTER TABLE "Preference" ADD COLUMN "pensionContribution" REAL NOT NULL DEFAULT 5164;
ALTER TABLE "Preference" ADD COLUMN "pensionFundAccessAge" INTEGER NOT NULL DEFAULT 62;
ALTER TABLE "Preference" ADD COLUMN "pensionFundExitTaxRate" REAL NOT NULL DEFAULT 15;
ALTER TABLE "Preference" ADD COLUMN "pensionExitMode" TEXT NOT NULL DEFAULT 'hybrid';
ALTER TABLE "Preference" ADD COLUMN "employerContributionType" TEXT NOT NULL DEFAULT 'percent';
ALTER TABLE "Preference" ADD COLUMN "employerContributionValue" REAL NOT NULL DEFAULT 1.5;

ALTER TABLE "AssetRecord" ADD COLUMN "otherAssetsOwnership" TEXT NOT NULL DEFAULT '{}';
