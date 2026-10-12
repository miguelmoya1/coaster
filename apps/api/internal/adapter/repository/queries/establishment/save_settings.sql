INSERT INTO "EstablishmentSettings" (
    id, "establishmentId", modules, language, "markSoldOut", "configuredAt", "createdAt", "updatedAt"
)
VALUES (
    $1, $2, $3::text[]::"EstablishmentModule"[], COALESCE($4::text, 'es'), COALESCE($5::boolean, false), $6, $6, $6
)
ON CONFLICT ("establishmentId") DO UPDATE SET
    modules = EXCLUDED.modules,
    language = COALESCE($4::text, "EstablishmentSettings".language),
    "markSoldOut" = COALESCE($5::boolean, "EstablishmentSettings"."markSoldOut"),
    "configuredAt" = EXCLUDED."configuredAt",
    "updatedAt" = EXCLUDED."updatedAt"
RETURNING "establishmentId", COALESCE(modules, '{}')::text[], language, "markSoldOut", "configuredAt"
