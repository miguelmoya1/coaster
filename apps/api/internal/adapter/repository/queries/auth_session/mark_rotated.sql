UPDATE "AuthSession"
SET "rotatedAt" = COALESCE("rotatedAt", $2), "lastUsedAt" = $2
WHERE id = $1
