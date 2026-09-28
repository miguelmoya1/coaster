UPDATE "Order"
SET "totalAmount" = $2, "updatedAt" = $3
WHERE id = $1
