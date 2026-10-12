UPDATE "Order"
SET "cashCloseId" = $2, "updatedAt" = $3
WHERE "establishmentId" = $1 AND "cashCloseId" IS NULL AND status IN ('CLOSED', 'CANCELLED')
