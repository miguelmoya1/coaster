DELETE FROM "AuthSession"
WHERE "userId" = $1 AND "expiresAt" < $2
