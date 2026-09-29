SELECT i.id, i."orderId", i."productId", p.name, i.quantity, i."priceAtPurchase", i."taxRateAtPurchase",
       i."paidQuantity", i."paidQuantityCash", i."paidQuantityCard", i."servedQuantity", i."paymentStatus"::text,
       i."deliveryStatus"::text, i."paymentMethod"::text, i.notes, i."createdAt", i."updatedAt"
FROM "OrderItem" i
JOIN "Product" p ON p.id = i."productId"
WHERE i."orderId" = ANY($1)
ORDER BY i."createdAt", i.id
