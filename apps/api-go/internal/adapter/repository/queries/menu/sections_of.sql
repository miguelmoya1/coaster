SELECT id, translations
FROM "MenuSection"
WHERE "menuId" = $1
ORDER BY position ASC
