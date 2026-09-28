SELECT c.id, c."establishmentId", c."closedById", u.name, c.since, c."closedAt",
       c."closedOrders", c."cancelledOrders", c."cancelledAmount", c."cashAmount", c."cardAmount", c."tipAmount",
       c."openingFloat", c."countedCash", c.notes
FROM "CashClose" c
JOIN "User" u ON u.id = c."closedById"
WHERE c."establishmentId" = $1
ORDER BY c."closedAt" DESC, c.id DESC
LIMIT 60
