-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProjectSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileType" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "supervisorApprovalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "supervisorRemarks" TEXT,
    "adminRemarks" TEXT,
    "committeeRemarks" TEXT,
    "conditionalApprovalRemarks" TEXT,
    "defenseAttempts" INTEGER NOT NULL DEFAULT 0,
    "defenseStatus" TEXT NOT NULL DEFAULT 'NOT_SCHEDULED',
    "approvedBySupervisorAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProjectSubmission" ("adminRemarks", "approvedBySupervisorAt", "committeeRemarks", "createdAt", "description", "fileName", "fileSize", "fileType", "fileUrl", "id", "isSubmitted", "projectId", "status", "studentId", "supervisorApprovalStatus", "supervisorRemarks", "title", "updatedAt", "version") SELECT "adminRemarks", "approvedBySupervisorAt", "committeeRemarks", "createdAt", "description", "fileName", "fileSize", "fileType", "fileUrl", "id", "isSubmitted", "projectId", "status", "studentId", "supervisorApprovalStatus", "supervisorRemarks", "title", "updatedAt", "version" FROM "ProjectSubmission";
DROP TABLE "ProjectSubmission";
ALTER TABLE "new_ProjectSubmission" RENAME TO "ProjectSubmission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
