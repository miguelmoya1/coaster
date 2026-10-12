UPDATE "AuthSession"
SET "revokedAt" = $2
WHERE "familyId" = $1 AND "revokedAt" IS NULL
