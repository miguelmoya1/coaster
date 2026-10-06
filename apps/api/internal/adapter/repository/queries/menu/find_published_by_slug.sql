SELECT m."publishedSnapshot", m."defaultLanguage", COALESCE(s."markSoldOut", false)
FROM "Menu" m
LEFT JOIN "EstablishmentSettings" s ON s."establishmentId" = m."establishmentId"
WHERE m.slug = $1
