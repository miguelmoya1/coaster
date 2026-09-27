SELECT
    (SELECT count(*) FROM "Category" WHERE "establishmentId" = $1 AND "deletedAt" IS NULL),
    (SELECT count(*)
     FROM "Product" p
     JOIN "Category" c ON c.id = p."categoryId"
     WHERE c."establishmentId" = $1 AND p."deletedAt" IS NULL),
    (SELECT count(*) FROM "Table" WHERE "establishmentId" = $1),
    (SELECT count(*) FROM "Order" WHERE "establishmentId" = $1),
    (SELECT count(*) FROM "Order" WHERE "establishmentId" = $1 AND "createdAt" >= $2),
    (SELECT COALESCE(sum("totalAmount"), 0)
     FROM "Order"
     WHERE "establishmentId" = $1 AND status = 'CLOSED' AND "createdAt" >= $2)
