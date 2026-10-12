INSERT INTO "UserPreferences" (id, "userId", language, "createdAt", "updatedAt")
VALUES ($1, $2, COALESCE($3, 'es'), $4, $4)
