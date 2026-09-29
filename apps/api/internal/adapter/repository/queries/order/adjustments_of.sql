SELECT id, "orderId", target::text, "itemId", type::text, value, reason, "createdAt"
FROM "OrderAdjustment"
WHERE "orderId" = ANY($1)
ORDER BY "createdAt", id
