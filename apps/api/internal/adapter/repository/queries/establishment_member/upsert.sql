INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, "createdAt", "updatedAt")
VALUES ($1, $2, $3, COALESCE($4::"EstablishmentRole", 'STAFF'), $5, $5)
ON CONFLICT ("userId", "establishmentId") DO UPDATE
SET role = CASE
        WHEN $4::"EstablishmentRole" IS NOT NULL THEN $4::"EstablishmentRole"
        WHEN "EstablishmentMember"."deletedAt" IS NULL THEN "EstablishmentMember".role
        ELSE 'STAFF'
    END,
    "deletedAt" = NULL,
    "updatedAt" = EXCLUDED."updatedAt"
RETURNING id
