SELECT id, name, price, "imageUrl", COALESCE(allergens, '{}')::text[], "deletedAt", "updatedAt"
FROM "Product"
WHERE id = ANY($1)
