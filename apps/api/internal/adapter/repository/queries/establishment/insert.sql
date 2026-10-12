INSERT INTO "Establishment" (id, name, "createdAt", "updatedAt")
VALUES ($1, $2, $3, $3)
RETURNING id, name, "createdAt", "updatedAt"
