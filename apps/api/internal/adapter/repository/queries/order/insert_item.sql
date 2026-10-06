INSERT INTO "OrderItem" (id, "orderId", "productId", quantity, "priceAtPurchase", "productNameAtPurchase",
                         "taxRateAtPurchase", notes, "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
