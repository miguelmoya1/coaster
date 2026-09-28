UPDATE "OrderItem"
SET notes = $3, "updatedAt" = $4
WHERE id = $2 AND "orderId" = $1
