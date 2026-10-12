UPDATE "User"
SET "passwordHash" = $2,
    "passwordUpdatedAt" = $3,
    "emailVerifiedAt" = CASE WHEN $4 THEN COALESCE("emailVerifiedAt", $3) ELSE "emailVerifiedAt" END,
    "updatedAt" = $3
WHERE id = $1
