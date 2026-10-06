UPDATE "Table"
SET name = $2, "updatedAt" = $3
WHERE id = $1
RETURNING id, "establishmentId", name, status::text, "createdAt", "updatedAt"
