-- Configuration split off from identity: which modules an establishment runs, and what each user
-- prefers. Both are 1-1 with their owner, so they could have been columns; they are tables because
-- the next setting to arrive should not need a migration on Establishment or User themselves.
--
-- Order matters. UserPreferences is filled from User.language before the column is dropped, or
-- everyone's language choice is lost.

CREATE TYPE "EstablishmentModule" AS ENUM ('TIME_TRACKING', 'ORDERS', 'INVENTORY');

CREATE TABLE "EstablishmentSettings" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "modules" "EstablishmentModule"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstablishmentSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstablishmentSettings_establishmentId_key" ON "EstablishmentSettings"("establishmentId");

ALTER TABLE "EstablishmentSettings" ADD CONSTRAINT "EstablishmentSettings_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every establishment that exists today is a bar, so it keeps everything it already had. Narrowing
-- that is a decision for its owner, not for a migration.
INSERT INTO "EstablishmentSettings" ("id", "establishmentId", "modules", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       "id",
       ARRAY['TIME_TRACKING', 'ORDERS', 'INVENTORY']::"EstablishmentModule"[],
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "Establishment";

INSERT INTO "UserPreferences" ("id", "userId", "language", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "language", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User";

ALTER TABLE "User" DROP COLUMN "language";
