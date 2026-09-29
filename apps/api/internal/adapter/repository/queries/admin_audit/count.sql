SELECT count(*)
FROM "AdminAuditLog" l
WHERE ($1::text IS NULL OR l."targetType" = $1)
  AND ($2::text IS NULL OR l."targetId" = $2)
  AND ($3::text IS NULL OR l.action = $3)
