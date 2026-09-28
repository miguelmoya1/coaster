UPDATE "Product"
SET name = COALESCE($2::text, name),
    "categoryId" = COALESCE($3::text, "categoryId"),
    price = COALESCE($4::integer, price),
    "currentStock" = COALESCE($5::integer, "currentStock"),
    "minStockAlert" = COALESCE($6::integer, "minStockAlert"),
    "imageUrl" = CASE WHEN $8::boolean THEN NULL ELSE COALESCE($7::text, "imageUrl") END,
    icon = CASE WHEN $10::boolean THEN NULL ELSE COALESCE($9::text, icon) END,
    allergens = COALESCE($11::text[]::"Allergen"[], allergens),
    "taxRate" = CASE WHEN $13::boolean THEN NULL ELSE COALESCE($12::integer, "taxRate") END,
    "updatedAt" = $14
WHERE id = $1
RETURNING id, "categoryId", name, price, "currentStock", "minStockAlert", "imageUrl", icon, "taxRate",
       COALESCE(allergens, '{}')::text[], "updatedAt"
