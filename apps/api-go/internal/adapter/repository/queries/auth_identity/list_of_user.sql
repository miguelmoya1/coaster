SELECT provider::text, subject, email, "createdAt"
FROM "AuthIdentity"
WHERE "userId" = $1
ORDER BY "createdAt" ASC
