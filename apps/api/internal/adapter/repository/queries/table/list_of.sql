SELECT id, "establishmentId", name, status::text, "createdAt", "updatedAt"
FROM "Table"
WHERE "establishmentId" = $1
ORDER BY name
