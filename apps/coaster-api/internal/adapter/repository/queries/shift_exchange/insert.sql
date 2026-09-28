INSERT INTO "ShiftExchange" (id, "shiftId", "requesterId", "targetId", status, "createdAt")
VALUES ($1, $2, $3, $4, 'PENDING', $5)
