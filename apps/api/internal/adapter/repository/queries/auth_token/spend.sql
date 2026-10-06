UPDATE "AuthToken"
SET "usedAt" = $2
WHERE id = $1 AND "usedAt" IS NULL
