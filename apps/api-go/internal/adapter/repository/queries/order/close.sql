UPDATE "Order"
SET status           = 'CLOSED',
    "totalAmount"    = $2,
    "paymentMethod"  = $3::"PaymentMethod",
    "amountPaidCash" = $4,
    "amountPaidCard" = $5,
    "updatedAt"      = $6
WHERE id = $1
