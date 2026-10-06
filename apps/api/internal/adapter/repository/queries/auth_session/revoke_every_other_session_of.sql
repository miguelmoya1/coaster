UPDATE "AuthSession"
SET "revokedAt" = $3
WHERE "userId" = $1 AND "revokedAt" IS NULL AND id <> $2
