UPDATE "Menu"
SET "publishedSnapshot" = $2, "publishedAt" = $3, "updatedAt" = $3
WHERE id = $1
