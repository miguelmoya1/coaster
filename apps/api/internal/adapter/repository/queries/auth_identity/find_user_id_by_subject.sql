SELECT "userId"
FROM "AuthIdentity"
WHERE provider = $1 AND subject = $2
