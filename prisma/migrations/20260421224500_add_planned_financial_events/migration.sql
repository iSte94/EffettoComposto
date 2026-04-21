-- CreateTable
CREATE TABLE "PlannedFinancialEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outflow',
    "kind" TEXT NOT NULL DEFAULT 'one_time',
    "category" TEXT NOT NULL DEFAULT 'other',
    "eventMonth" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "upfrontAmount" REAL,
    "financedAmount" REAL,
    "interestRate" REAL,
    "durationMonths" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "PlannedFinancialEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlannedFinancialEvent_userId_eventMonth_idx" ON "PlannedFinancialEvent"("userId", "eventMonth");

-- CreateIndex
CREATE INDEX "PlannedFinancialEvent_userId_status_eventMonth_idx" ON "PlannedFinancialEvent"("userId", "status", "eventMonth");
