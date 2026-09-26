UPDATE "AuthIdentity"
SET "lastLoginAt" = $3
WHERE provider = $1 AND subject = $2
