SELECT slug
FROM "Menu"
WHERE starts_with(slug, $1)
