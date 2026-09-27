SELECT id, "establishmentId", name, status::text, "createdAt", "updatedAt"
FROM "Table"
WHERE id = $1
