UPDATE "EstablishmentMember"
SET role = $3::"EstablishmentRole", "updatedAt" = $4
WHERE id = $1 AND "establishmentId" = $2 AND "deletedAt" IS NULL
