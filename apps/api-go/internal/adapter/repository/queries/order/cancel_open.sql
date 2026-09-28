UPDATE "Order"
SET status = 'CANCELLED', "updatedAt" = $2
WHERE id = $1 AND status = 'OPEN'
