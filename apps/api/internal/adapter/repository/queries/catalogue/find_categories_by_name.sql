SELECT id, name
FROM "Category"
WHERE "establishmentId" = $1 AND "deletedAt" IS NULL AND name = ANY($2)
