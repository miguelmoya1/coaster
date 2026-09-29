SELECT p.id, p."categoryId", p.name, p.price, p."currentStock", p."minStockAlert", p."imageUrl", p.icon,
       p."taxRate", COALESCE(p.allergens, '{}')::text[], p."updatedAt", c."taxRate"
FROM "Product" p
JOIN "Category" c ON c.id = p."categoryId"
WHERE c."establishmentId" = $1 AND c."deletedAt" IS NULL AND p."deletedAt" IS NULL
ORDER BY p.name ASC
