SELECT EXISTS (
    SELECT 1
    FROM "Product" p
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE p.id = $1 AND p."deletedAt" IS NULL AND c."establishmentId" = $2
)
