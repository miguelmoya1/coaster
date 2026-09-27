SELECT id, "userId", "establishmentId", role::text, active
FROM "EstablishmentMember"
WHERE "establishmentId" = $1 AND active AND "deletedAt" IS NULL
