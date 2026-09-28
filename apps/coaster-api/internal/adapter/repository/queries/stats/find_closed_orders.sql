SELECT "amountPaidCash", "amountPaidCard", "tipAmount", "createdAt"
FROM "Order"
WHERE "establishmentId" = $1 AND status = 'CLOSED' AND "createdAt" >= $2
ORDER BY "createdAt"
