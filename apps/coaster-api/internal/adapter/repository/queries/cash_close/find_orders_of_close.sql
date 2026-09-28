SELECT id, status, "amountPaidCash", "amountPaidCard", "tipAmount"
FROM "Order"
WHERE "cashCloseId" = $1
