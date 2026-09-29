SELECT "orderId", id, "priceAtPurchase", quantity, "paidQuantity", "taxRateAtPurchase"
FROM "OrderItem"
WHERE "orderId" = ANY($1)
