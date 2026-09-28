UPDATE "Order"
SET "totalAmount"    = $2,
    "tableId"        = $3,
    "tableName"      = $4,
    "amountPaidCash" = $5,
    "amountPaidCard" = $6,
    "paymentMethod"  = $7::"PaymentMethod",
    "tipAmount"      = $8,
    "updatedAt"      = $9
WHERE id = $1
