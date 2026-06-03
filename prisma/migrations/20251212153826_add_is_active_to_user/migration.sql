-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rollNumber" TEXT,
    "profileImage" TEXT,
    "gpa" REAL,
    "department" TEXT,
    "specialization" TEXT,
    "contactInfo" TEXT,
    "resetToken" TEXT,
    "resetTokenExpiry" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("contactInfo", "createdAt", "department", "email", "gpa", "id", "name", "password", "profileImage", "resetToken", "resetTokenExpiry", "role", "rollNumber", "specialization", "status", "updatedAt") SELECT "contactInfo", "createdAt", "department", "email", "gpa", "id", "name", "password", "profileImage", "resetToken", "resetTokenExpiry", "role", "rollNumber", "specialization", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_rollNumber_key" ON "User"("rollNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
