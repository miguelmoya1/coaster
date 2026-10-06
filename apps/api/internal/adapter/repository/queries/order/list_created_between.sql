SELECT o.id, o."establishmentId", o."tableId", o."tableName", t.name, o.status::text, o."totalAmount",
       o."amountPaidCash", o."amountPaidCard", o."paymentMethod"::text, o.notes, o."ticketNotes", o."tipAmount",
       o."cashCloseId", o."createdAt", o."updatedAt"
FROM "Order" o
LEFT JOIN "Table" t ON t.id = o."tableId"
WHERE o."establishmentId" = $1
  AND o."createdAt" >= $2
  AND o."createdAt" < $3
ORDER BY o."createdAt" DESC
