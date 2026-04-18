-- CreateTable
CREATE TABLE "AssistantPendingAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "assistantMessageId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'web',
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "previewText" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "resultSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "cancelledAt" DATETIME,
    "executedAt" DATETIME,
    CONSTRAINT "AssistantPendingAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssistantPendingAction_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AssistantThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssistantPendingAction_assistantMessageId_fkey" FOREIGN KEY ("assistantMessageId") REFERENCES "AssistantMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TelegramBotConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "botTokenEnc" TEXT NOT NULL,
    "botId" TEXT,
    "botUsername" TEXT,
    "botFirstName" TEXT,
    "webhookSecret" TEXT NOT NULL,
    "botStatus" TEXT NOT NULL DEFAULT 'configured',
    "linkStatus" TEXT NOT NULL DEFAULT 'pending',
    "linkCode" TEXT,
    "linkCodeExpiresAt" DATETIME,
    "telegramUserId" TEXT,
    "telegramChatId" TEXT,
    "telegramUsername" TEXT,
    "linkedAt" DATETIME,
    "currentThreadId" TEXT,
    "lastWebhookAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TelegramBotConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TelegramBotConnection_currentThreadId_fkey" FOREIGN KEY ("currentThreadId") REFERENCES "AssistantThread" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AssistantThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'web',
    "title" TEXT NOT NULL DEFAULT 'Nuova conversazione',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssistantThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AssistantThread" ("createdAt", "id", "title", "updatedAt", "userId") SELECT "createdAt", "id", "title", "updatedAt", "userId" FROM "AssistantThread";
DROP TABLE "AssistantThread";
ALTER TABLE "new_AssistantThread" RENAME TO "AssistantThread";
CREATE INDEX "AssistantThread_userId_updatedAt_idx" ON "AssistantThread"("userId", "updatedAt");
CREATE INDEX "AssistantThread_userId_channel_updatedAt_idx" ON "AssistantThread"("userId", "channel", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AssistantPendingAction_userId_status_createdAt_idx" ON "AssistantPendingAction"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantPendingAction_threadId_status_createdAt_idx" ON "AssistantPendingAction"("threadId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AssistantPendingAction_assistantMessageId_idx" ON "AssistantPendingAction"("assistantMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramBotConnection_userId_key" ON "TelegramBotConnection"("userId");

-- CreateIndex
CREATE INDEX "TelegramBotConnection_botStatus_idx" ON "TelegramBotConnection"("botStatus");

-- CreateIndex
CREATE INDEX "TelegramBotConnection_linkStatus_idx" ON "TelegramBotConnection"("linkStatus");

-- CreateIndex
CREATE INDEX "TelegramBotConnection_telegramUserId_idx" ON "TelegramBotConnection"("telegramUserId");
