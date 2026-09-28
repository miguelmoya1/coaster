SELECT modules::text[]
FROM "EstablishmentSettings"
WHERE "establishmentId" = $1
