SELECT "orderId", id, target, type, value, "itemId"
FROM "OrderAdjustment"
WHERE "orderId" = ANY($1)
