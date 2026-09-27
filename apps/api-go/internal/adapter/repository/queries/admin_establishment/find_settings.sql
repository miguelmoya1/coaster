SELECT "establishmentId", COALESCE(modules, '{}')::text[], language, "markSoldOut", "configuredAt"
FROM "EstablishmentSettings"
WHERE "establishmentId" = $1
