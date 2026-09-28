SELECT "sectionId", "productId", price, "isVisible", translations
FROM "MenuItem"
WHERE "sectionId" = ANY($1)
ORDER BY position ASC
