SELECT e.id, e.name, m.role::text, m.active, m."createdAt"
FROM "EstablishmentMember" m
JOIN "Establishment" e ON e.id = m."establishmentId"
WHERE m."userId" = $1 AND m."deletedAt" IS NULL
ORDER BY m."createdAt" DESC
