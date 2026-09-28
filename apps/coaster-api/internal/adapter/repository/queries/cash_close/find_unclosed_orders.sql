SELECT id, status, "amountPaidCash", "amountPaidCard", "tipAmount"
FROM "Order"
WHERE "establishmentId" = $1 AND "cashCloseId" IS NULL AND status IN ('CLOSED', 'CANCELLED')
