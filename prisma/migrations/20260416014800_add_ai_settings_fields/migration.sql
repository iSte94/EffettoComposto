-- AlterTable: add AI settings and subscriptions columns to Preference
ALTER TABLE "Preference" ADD COLUMN "subscriptionsList" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Preference" ADD COLUMN "aiRememberKeys" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Preference" ADD COLUMN "aiProvider" TEXT;
ALTER TABLE "Preference" ADD COLUMN "aiModel" TEXT;
ALTER TABLE "Preference" ADD COLUMN "aiApiKeyEnc" TEXT;
ALTER TABLE "Preference" ADD COLUMN "aiUserProfile" TEXT NOT NULL DEFAULT '';
