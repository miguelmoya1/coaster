INSERT INTO "AuthIdentity" (id, "userId", provider, subject, email, "createdAt", "lastLoginAt")
VALUES ($1, $2, $3, $4, $5, $6, $6)
ON CONFLICT (provider, "userId") DO UPDATE
SET subject = EXCLUDED.subject, email = EXCLUDED.email, "lastLoginAt" = EXCLUDED."lastLoginAt"
