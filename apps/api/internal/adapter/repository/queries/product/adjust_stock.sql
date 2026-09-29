UPDATE "Product"
SET "currentStock" = "currentStock" + $2, "updatedAt" = $3
WHERE id = $1
RETURNING id, "categoryId", name, price, "currentStock", "minStockAlert", "imageUrl", icon, "taxRate",
       COALESCE(allergens, '{}')::text[], "updatedAt"
