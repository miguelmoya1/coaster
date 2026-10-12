INSERT INTO "CashClose" (
    id, "establishmentId", "closedById", since, "closedAt",
    "closedOrders", "cancelledOrders", "cancelledAmount", "cashAmount", "cardAmount", "tipAmount",
    "openingFloat", "countedCash", notes
)
VALUES ($1, $2, $3, $4, $5, 0, 0, 0, 0, 0, 0, $6, $7, $8)
