SELECT m.id, m."userId", m.active, u.email, u.active, u."passwordUpdatedAt",
       (SELECT count(*) FROM "AuthIdentity" i WHERE i."userId" = u.id),
       e.name
FROM "EstablishmentMember" m
JOIN "User" u ON u.id = m."userId"
JOIN "Establishment" e ON e.id = m."establishmentId"
WHERE m.id = $1 AND m."establishmentId" = $2 AND m."deletedAt" IS NULL
