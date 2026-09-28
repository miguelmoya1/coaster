UPDATE "AuthSession"
SET "revokedAt" = $2
WHERE "userId" = $1 AND "revokedAt" IS NULL
