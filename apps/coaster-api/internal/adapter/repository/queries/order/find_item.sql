SELECT "orderId", quantity, "paidQuantity", "paidQuantityCash", "paidQuantityCard"
FROM "OrderItem"
WHERE id = $1
