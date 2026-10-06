SELECT id, "userId", "tokenHash", "familyId", "userAgent", ip, "createdAt", "lastUsedAt", "expiresAt", "rotatedAt", "revokedAt"
FROM "AuthSession"
WHERE "tokenHash" = $1
