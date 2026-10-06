SELECT l.id, l.action, l."targetType", l."targetId", l."targetLabel", l.reason, l.metadata, l."createdAt",
       u.id, u.name, u.email
FROM "AdminAuditLog" l
JOIN "User" u ON u.id = l."actorId"
WHERE ($1::text IS NULL OR l."targetType" = $1)
  AND ($2::text IS NULL OR l."targetId" = $2)
  AND ($3::text IS NULL OR l.action = $3)
ORDER BY l."createdAt" DESC, l.id DESC
LIMIT $4 OFFSET $5
