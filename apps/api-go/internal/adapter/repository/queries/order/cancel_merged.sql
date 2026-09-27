UPDATE "Order"
SET status = 'CANCELLED', "amountPaidCash" = 0, "amountPaidCard" = 0, "tipAmount" = 0, "updatedAt" = $2
WHERE id = $1
