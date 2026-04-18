-- CreateTable
CREATE TABLE "TelegramPendingMediaGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "mediaGroupId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'expense_capture',
    "status" TEXT NOT NULL DEFAULT 'collecting',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "processedAt" DATETIME,
    CONSTRAINT "TelegramPendingMediaGroup_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TelegramBotConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TelegramPendingMediaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "telegramMessageId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BLOB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramPendingMediaItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelegramPendingMediaGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramPendingMediaGroup_connectionId_mediaGroupId_key" ON "TelegramPendingMediaGroup"("connectionId", "mediaGroupId");

-- CreateIndex
CREATE INDEX "TelegramPendingMediaGroup_connectionId_status_updatedAt_idx" ON "TelegramPendingMediaGroup"("connectionId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramPendingMediaItem_groupId_telegramMessageId_key" ON "TelegramPendingMediaItem"("groupId", "telegramMessageId");

-- CreateIndex
CREATE INDEX "TelegramPendingMediaItem_groupId_sortOrder_createdAt_idx" ON "TelegramPendingMediaItem"("groupId", "sortOrder", "createdAt");
