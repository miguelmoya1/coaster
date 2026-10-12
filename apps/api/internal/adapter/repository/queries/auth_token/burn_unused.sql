UPDATE "AuthToken"
SET "usedAt" = $3
WHERE "userId" = $1 AND purpose = $2 AND "usedAt" IS NULL
