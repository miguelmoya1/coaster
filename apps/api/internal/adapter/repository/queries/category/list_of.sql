SELECT id, "establishmentId", name, icon, "taxRate"
FROM "Category"
WHERE "establishmentId" = $1 AND "deletedAt" IS NULL
ORDER BY name ASC
