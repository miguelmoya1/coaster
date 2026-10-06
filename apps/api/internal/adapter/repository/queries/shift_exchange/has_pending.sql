SELECT EXISTS (
  SELECT 1
  FROM "ShiftExchange"
  WHERE "shiftId" = $1 AND status = 'PENDING'
)
