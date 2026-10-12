SELECT id, name, "createdAt", "updatedAt"
FROM "Establishment"
WHERE id IN (
    SELECT "establishmentId"
    FROM "EstablishmentMember"
    WHERE "userId" = $1 AND active AND "deletedAt" IS NULL
)
