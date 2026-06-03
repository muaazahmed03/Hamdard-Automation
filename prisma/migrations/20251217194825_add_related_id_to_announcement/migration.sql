-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "relatedId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FormSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "submittedBy" TEXT,
    "status" TEXT DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewComments" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_FormSubmission" ("approvedBy", "createdAt", "data", "id", "reviewComments", "reviewedAt", "reviewedBy", "status", "submittedBy", "type", "updatedAt") SELECT "approvedBy", "createdAt", "data", "id", "reviewComments", "reviewedAt", "reviewedBy", "status", "submittedBy", "type", "updatedAt" FROM "FormSubmission";
DROP TABLE "FormSubmission";
ALTER TABLE "new_FormSubmission" RENAME TO "FormSubmission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
