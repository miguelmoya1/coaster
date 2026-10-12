INSERT INTO "Product" (id, "categoryId", name, price, "currentStock", "minStockAlert", "imageUrl", icon, "taxRate",
                       allergens, "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[]::"Allergen"[], $11, $11)
RETURNING id, "categoryId", name, price, "currentStock", "minStockAlert", "imageUrl", icon, "taxRate",
       COALESCE(allergens, '{}')::text[], "updatedAt"
