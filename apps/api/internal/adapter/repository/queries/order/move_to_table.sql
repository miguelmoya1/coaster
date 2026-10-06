UPDATE "Order"
SET "tableId" = $2, "tableName" = $3, "updatedAt" = $4
WHERE id = $1 AND status = 'OPEN'
