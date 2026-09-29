SELECT o.id, o."establishmentId", o."tableId", o."tableName", t.name, o.status::text, o."totalAmount",
       o."amountPaidCash", o."amountPaidCard", o."paymentMethod"::text, o.notes, o."ticketNotes", o."tipAmount",
       o."cashCloseId", o."createdAt", o."updatedAt"
FROM "Order" o
LEFT JOIN "Table" t ON t.id = o."tableId"
WHERE o."establishmentId" = $1
  AND ($2::"OrderStatus" IS NULL OR o.status = $2::"OrderStatus")
ORDER BY o."createdAt" DESC
