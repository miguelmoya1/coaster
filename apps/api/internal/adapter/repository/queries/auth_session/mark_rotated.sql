UPDATE "AuthSession"
SET "rotatedAt" = $2, "lastUsedAt" = $2
WHERE id = $1
