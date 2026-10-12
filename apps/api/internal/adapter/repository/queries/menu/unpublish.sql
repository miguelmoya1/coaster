UPDATE "Menu"
SET "publishedSnapshot" = NULL, "publishedAt" = NULL, "updatedAt" = $2
WHERE id = $1
