SELECT EXISTS (
    SELECT 1
    FROM "EstablishmentMember" m
    JOIN "User" u ON u.id = m."userId"
    WHERE m."establishmentId" = $1 AND u.email = $2 AND m."deletedAt" IS NULL
)
