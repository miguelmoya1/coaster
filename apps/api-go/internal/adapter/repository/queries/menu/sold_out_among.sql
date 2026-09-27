SELECT id
FROM "Product"
WHERE id = ANY($1) AND "currentStock" <= 0
