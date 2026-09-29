UPDATE "OrderItem"
SET "servedQuantity" = $2, "deliveryStatus" = $3::"DeliveryStatus", "updatedAt" = $4
WHERE id = $1
