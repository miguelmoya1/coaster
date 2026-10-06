SELECT e.name, s.language
FROM "Establishment" e
LEFT JOIN "EstablishmentSettings" s ON s."establishmentId" = e.id
WHERE e.id = $1
