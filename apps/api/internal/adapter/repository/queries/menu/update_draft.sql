UPDATE "Menu"
SET name = $2, languages = $3, "updatedAt" = $4
WHERE id = $1
