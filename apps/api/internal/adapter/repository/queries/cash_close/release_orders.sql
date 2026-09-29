UPDATE "Order"
SET "cashCloseId" = NULL, "updatedAt" = $2
WHERE "cashCloseId" = $1
