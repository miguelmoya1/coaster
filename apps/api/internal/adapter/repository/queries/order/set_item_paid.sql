UPDATE "OrderItem"
SET "paidQuantity"     = $2,
    "paidQuantityCash" = $3,
    "paidQuantityCard" = $4,
    "paymentStatus"    = $5::"PaymentStatus",
    "paymentMethod"    = $6::"PaymentMethod",
    "updatedAt"        = $7
WHERE id = $1
