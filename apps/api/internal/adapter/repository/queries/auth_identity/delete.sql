DELETE FROM "AuthIdentity"
WHERE "userId" = $1 AND provider = $2
