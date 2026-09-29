SELECT "amountPaidCash", "amountPaidCard"
FROM "Order"
WHERE "establishmentId" = $1 AND status = 'OPEN'
