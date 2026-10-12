SELECT p.id, p.name, p.price, p."taxRate", c."taxRate"
FROM "Product" p
JOIN "Category" c ON c.id = p."categoryId"
WHERE p.id = ANY($2)
  AND p."deletedAt" IS NULL
  AND c."establishmentId" = $1
  AND c."deletedAt" IS NULL
