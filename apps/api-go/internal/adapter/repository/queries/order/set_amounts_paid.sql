UPDATE "Order"
SET "paymentMethod" = $2::"PaymentMethod", "amountPaidCash" = $3, "amountPaidCard" = $4, "updatedAt" = $5
WHERE id = $1
