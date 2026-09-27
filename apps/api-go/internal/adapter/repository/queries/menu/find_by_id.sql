SELECT id, "establishmentId", slug, name, "defaultLanguage", languages, "publishedAt", "updatedAt"
FROM "Menu"
WHERE id = $1
