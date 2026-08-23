ALTER TABLE "User" RENAME COLUMN "googleId" TO "firebaseUid";

ALTER INDEX "User_googleId_key" RENAME TO "User_firebaseUid_key";
