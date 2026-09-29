UPDATE "Category"
SET name = $3,
    icon = CASE WHEN $5::boolean THEN NULL ELSE COALESCE($4::text, icon) END,
    "taxRate" = COALESCE($6::integer, "taxRate")
WHERE id = $1 AND "establishmentId" = $2
RETURNING id, "establishmentId", name, icon, "taxRate"
