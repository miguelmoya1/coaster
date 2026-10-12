INSERT INTO "Order" (id, "establishmentId", "createdById", "tableId", "tableName", status, "totalAmount", "tipAmount",
                     notes, "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, $5, 'OPEN', $6, $7, $8, $9, $9)
