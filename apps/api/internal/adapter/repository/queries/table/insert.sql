INSERT INTO "Table" (id, name, "establishmentId", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $4)
RETURNING id, "establishmentId", name, status::text, "createdAt", "updatedAt"
