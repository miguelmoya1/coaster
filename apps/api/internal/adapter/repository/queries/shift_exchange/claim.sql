UPDATE "ShiftExchange"
SET status = 'APPROVED', "targetId" = $2
WHERE id = $1 AND status = 'PENDING'
