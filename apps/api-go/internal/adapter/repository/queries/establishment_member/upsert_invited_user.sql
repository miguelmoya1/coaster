INSERT INTO "User" (id, email, name, "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $4)
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name, "updatedAt" = EXCLUDED."updatedAt"
RETURNING id
