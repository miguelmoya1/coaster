SELECT EXISTS (
    SELECT 1 FROM "Category" WHERE id = $1 AND "establishmentId" = $2
)
