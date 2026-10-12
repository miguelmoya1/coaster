INSERT INTO "UserPreferences" (id, "userId", language, "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $4)
ON CONFLICT ("userId") DO UPDATE SET
    language = EXCLUDED.language,
    "updatedAt" = EXCLUDED."updatedAt"
