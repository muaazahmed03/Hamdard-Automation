-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StudentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "semester" INTEGER,
    "batch" TEXT,
    "interests" TEXT,
    "skills" TEXT,
    "faculty" TEXT,
    "session" TEXT,
    "contactInfo" TEXT,
    "cgpa" REAL,
    "prerequisitesPassed" BOOLEAN NOT NULL DEFAULT false,
    "eligibilityStatus" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "transcriptUrl" TEXT,
    "unpassedCourses" TEXT,
    "policyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "policyAcceptedAt" DATETIME,
    "conditionalCommitment" TEXT,
    CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudentProfile" ("batch", "id", "interests", "semester", "skills", "userId") SELECT "batch", "id", "interests", "semester", "skills", "userId" FROM "StudentProfile";
DROP TABLE "StudentProfile";
ALTER TABLE "new_StudentProfile" RENAME TO "StudentProfile";
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
