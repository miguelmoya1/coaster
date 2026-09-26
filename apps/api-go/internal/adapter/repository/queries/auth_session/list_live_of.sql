SELECT id, "userId", "tokenHash", "familyId", "userAgent", ip, "createdAt", "lastUsedAt", "expiresAt", "rotatedAt", "revokedAt"
FROM "AuthSession"
WHERE "userId" = $1 AND "revokedAt" IS NULL AND "expiresAt" > $2
ORDER BY "lastUsedAt" DESC
