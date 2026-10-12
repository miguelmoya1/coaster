SELECT m.id, u.id, u.name, u.email, u."photoUrl", m.role::text, m.active, m."createdAt"
FROM "EstablishmentMember" m
JOIN "User" u ON u.id = m."userId"
WHERE m."establishmentId" = $1 AND m."deletedAt" IS NULL
ORDER BY m.role, m."createdAt"
