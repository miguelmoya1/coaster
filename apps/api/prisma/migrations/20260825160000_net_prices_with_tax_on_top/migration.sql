UPDATE "Product" AS p
SET "price" = ROUND(p."price"::numeric * 10000 / (10000 + COALESCE(p."taxRate", c."taxRate")))
FROM "Category" AS c
WHERE c."id" = p."categoryId" AND p."price" > 0;

UPDATE "OrderItem"
SET "priceAtPurchase" = ROUND("priceAtPurchase"::numeric * 10000 / (10000 + "taxRateAtPurchase"))
WHERE "priceAtPurchase" > 0;

UPDATE "MenuItem"
SET "price" = ROUND("price"::numeric * 10000 / 11000)
WHERE "price" IS NOT NULL AND "price" > 0;
