SELECT id, email, "createdAt"
FROM "User"
WHERE email = ANY($1)
