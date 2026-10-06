UPDATE "OrderAdjustment"
SET "orderId" = $2, type = $3::"AdjustmentType", value = $4
WHERE id = $1
