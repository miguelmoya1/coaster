INSERT INTO "Category" (id, "establishmentId", name, icon, "taxRate")
VALUES ($1, $2, $3, $4, $5)
RETURNING id, "establishmentId", name, icon, "taxRate"
