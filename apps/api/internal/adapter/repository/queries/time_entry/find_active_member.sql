SELECT m."userId", u.name, u.email, m.role::text
FROM "EstablishmentMember" m
JOIN "User" u ON u.id = m."userId"
WHERE m."establishmentId" = $1 AND m."userId" = $2 AND m.active AND m."deletedAt" IS NULL
