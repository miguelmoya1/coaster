SELECT count(*)
FROM "EstablishmentMember"
WHERE "establishmentId" = $1 AND active AND "deletedAt" IS NULL
