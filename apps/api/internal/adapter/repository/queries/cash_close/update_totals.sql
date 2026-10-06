UPDATE "CashClose"
SET "closedOrders" = $2, "cancelledOrders" = $3, "cancelledAmount" = $4,
    "cashAmount" = $5, "cardAmount" = $6, "tipAmount" = $7
WHERE id = $1
