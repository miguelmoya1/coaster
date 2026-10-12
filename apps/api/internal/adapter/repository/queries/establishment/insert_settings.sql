INSERT INTO "EstablishmentSettings" (id, "establishmentId", modules, language, "createdAt", "updatedAt")
VALUES ($1, $2, $3::text[]::"EstablishmentModule"[], $4, $5, $5)
