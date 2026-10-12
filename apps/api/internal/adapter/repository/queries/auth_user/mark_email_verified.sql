UPDATE "User"
SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", $2),
    "updatedAt" = $2
WHERE id = $1
