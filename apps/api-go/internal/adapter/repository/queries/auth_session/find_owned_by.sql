SELECT id, "userId", "tokenHash", "familyId", "userAgent", ip, "createdAt", "lastUsedAt", "expiresAt", "rotatedAt", "revokedAt"
FROM "AuthSession"
WHERE id = $1 AND "userId" = $2
