UPDATE "Order"
SET status = 'CLOSED', "updatedAt" = $2
WHERE id = $1 AND status = 'OPEN'
