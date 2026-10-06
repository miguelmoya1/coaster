INSERT INTO "OrderAdjustment" (id, "orderId", target, "itemId", type, value, reason, "createdAt")
VALUES ($1, $2, $3::"AdjustmentTarget", $4, $5::"AdjustmentType", $6, $7, $8)
