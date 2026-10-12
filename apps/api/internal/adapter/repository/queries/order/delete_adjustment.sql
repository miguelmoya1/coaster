DELETE FROM "OrderAdjustment"
WHERE id = $2 AND "orderId" = $1
