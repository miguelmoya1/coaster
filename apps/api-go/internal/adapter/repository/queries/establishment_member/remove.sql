UPDATE "EstablishmentMember"
SET "deletedAt" = $3, "updatedAt" = $3
WHERE id = $1 AND "establishmentId" = $2
