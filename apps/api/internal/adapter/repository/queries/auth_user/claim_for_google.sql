UPDATE "User"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", $4),
    "passwordHash" = CASE WHEN $2 THEN NULL ELSE "passwordHash" END,
    "passwordUpdatedAt" = CASE WHEN $2 THEN NULL ELSE "passwordUpdatedAt" END,
    "photoUrl" = COALESCE("photoUrl", $3),
    "updatedAt" = $4
WHERE id = $1
