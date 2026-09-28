INSERT INTO "AdminAuditLog" (id, "actorId", action, "targetType", "targetId", "targetLabel", reason, metadata, "createdAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
