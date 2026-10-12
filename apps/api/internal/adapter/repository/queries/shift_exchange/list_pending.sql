SELECT e.id, e."shiftId", e."requesterId", e."targetId", e.status, u.name, s."startTime", s."endTime", e."createdAt"
FROM "ShiftExchange" e
JOIN "Shift" s ON s.id = e."shiftId"
JOIN "User" u ON u.id = e."requesterId"
WHERE e.status = 'PENDING' AND s."establishmentId" = $1 AND s."startTime" >= $2
ORDER BY s."startTime"
