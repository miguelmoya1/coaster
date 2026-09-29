SELECT p.id
FROM "Product" p
JOIN "Category" c ON c.id = p."categoryId"
WHERE p.id = ANY($1) AND p."deletedAt" IS NULL AND c."establishmentId" = $2
