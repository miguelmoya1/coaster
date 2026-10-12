SELECT "categoryId", name
FROM "Product"
WHERE "categoryId" = ANY($1) AND "deletedAt" IS NULL
