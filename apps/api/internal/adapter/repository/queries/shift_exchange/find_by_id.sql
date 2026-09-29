SELECT e.id, e."shiftId", e."requesterId", e."targetId", e.status, s."establishmentId", s."startTime"
FROM "ShiftExchange" e
JOIN "Shift" s ON s.id = e."shiftId"
WHERE e.id = $1
