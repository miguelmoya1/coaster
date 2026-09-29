UPDATE "Order"
SET "tipAmount" = $2, "updatedAt" = $3
WHERE id = $1
