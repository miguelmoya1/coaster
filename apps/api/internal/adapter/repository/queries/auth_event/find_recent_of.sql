SELECT id, type::text, "userId", email, "sessionId", ip, "userAgent", metadata, "createdAt"
FROM "AuthEvent"
WHERE "userId" = $1
ORDER BY "createdAt" DESC
LIMIT $2
