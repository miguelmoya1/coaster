SELECT l.id, l.action, l."targetType", l."targetId", l."targetLabel", l.reason, l.metadata, l."createdAt",
       u.id, u.name, u.email
FROM "AdminAuditLog" l
JOIN "User" u ON u.id = l."actorId"
WHERE l."targetType" = $1 AND l."targetId" = $2
ORDER BY l."createdAt" DESC, l.id DESC
LIMIT $3
