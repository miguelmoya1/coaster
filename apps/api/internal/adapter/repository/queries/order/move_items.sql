UPDATE "OrderItem"
SET "orderId" = $2, "updatedAt" = $3
WHERE "orderId" = $1
