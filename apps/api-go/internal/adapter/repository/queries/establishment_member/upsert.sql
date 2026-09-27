INSERT INTO "EstablishmentMember" (id, "userId", "establishmentId", role, "createdAt", "updatedAt")
VALUES ($1, $2, $3, COALESCE($4::"EstablishmentRole", 'STAFF'), $5, $5)
ON CONFLICT ("userId", "establishmentId") DO UPDATE
SET role = COALESCE($4::"EstablishmentRole", "EstablishmentMember".role),
    "deletedAt" = NULL,
    "updatedAt" = EXCLUDED."updatedAt"
RETURNING id
