UPDATE "Product"
SET "deletedAt" = $2, "updatedAt" = $2
WHERE id = $1
