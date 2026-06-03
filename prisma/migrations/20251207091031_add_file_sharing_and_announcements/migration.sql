-- AlterTable
ALTER TABLE "Message" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Message" ADD COLUMN "deletedBy" TEXT;
ALTER TABLE "Message" ADD COLUMN "fileName" TEXT;
ALTER TABLE "Message" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Message" ADD COLUMN "fileType" TEXT;
ALTER TABLE "Message" ADD COLUMN "fileUrl" TEXT;

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "expiresAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
