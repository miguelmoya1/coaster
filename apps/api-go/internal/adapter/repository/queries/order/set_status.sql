UPDATE "Order"
SET status = $2::"OrderStatus", "updatedAt" = $3
WHERE id = $1
