SELECT id, "userId", purpose::text, "expiresAt", "usedAt"
FROM "AuthToken"
WHERE "tokenHash" = $1
