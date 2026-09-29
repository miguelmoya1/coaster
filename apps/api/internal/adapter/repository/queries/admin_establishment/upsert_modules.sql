INSERT INTO "EstablishmentSettings" (id, "establishmentId", modules, "createdAt", "updatedAt")
VALUES ($1, $2, $3::text[]::"EstablishmentModule"[], $4, $4)
ON CONFLICT ("establishmentId") DO UPDATE SET
    modules = EXCLUDED.modules,
    "updatedAt" = EXCLUDED."updatedAt"
RETURNING "establishmentId", COALESCE(modules, '{}')::text[], language, "markSoldOut", "configuredAt"
