-- CreateTable
CREATE TABLE "DefenseSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defenseType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "defenseDate" DATETIME NOT NULL,
    "defenseTime" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JuryAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "defenseScheduleId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupName" TEXT,
    "projectTitle" TEXT,
    "juryMembers" TEXT NOT NULL,
    "chairpersonId" TEXT,
    "evaluationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "marks" REAL,
    "feedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JuryAssignment_defenseScheduleId_fkey" FOREIGN KEY ("defenseScheduleId") REFERENCES "DefenseSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "approvedBySupervisorAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProjectSubmission" ("createdAt", "description", "fileName", "fileSize", "fileType", "fileUrl", "id", "isSubmitted", "projectId", "status", "studentId", "title", "updatedAt", "version") SELECT "createdAt", "description", "fileName", "fileSize", "fileType", "fileUrl", "id", "isSubmitted", "projectId", "status", "studentId", "title", "updatedAt", "version" FROM "ProjectSubmission";
DROP TABLE "ProjectSubmission";
ALTER TABLE "new_ProjectSubmission" RENAME TO "ProjectSubmission";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "JuryAssignment_defenseScheduleId_groupId_key" ON "JuryAssignment"("defenseScheduleId", "groupId");
