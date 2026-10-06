SELECT id, "establishmentId", slug, name, "defaultLanguage", languages, "publishedAt", "updatedAt"
FROM "Menu"
WHERE "establishmentId" = $1
LIMIT 1
