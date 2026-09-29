SELECT id, "userId", "establishmentId", role::text, active
FROM "EstablishmentMember"
WHERE "userId" = $1 AND "establishmentId" = $2 AND "deletedAt" IS NULL
