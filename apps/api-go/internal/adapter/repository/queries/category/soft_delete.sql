UPDATE "Category"
SET "deletedAt" = $3
WHERE id = $1 AND "establishmentId" = $2
