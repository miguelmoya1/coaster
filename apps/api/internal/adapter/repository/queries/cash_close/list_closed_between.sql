SELECT c.id, c."establishmentId", c."closedById", u.name, c.since, c."closedAt",
       c."closedOrders", c."cancelledOrders", c."cancelledAmount", c."cashAmount", c."cardAmount", c."tipAmount",
       c."openingFloat", c."countedCash", c.notes, c."voidedAt", c."voidedById", v.name
FROM "CashClose" c
JOIN "User" u ON u.id = c."closedById"
LEFT JOIN "User" v ON v.id = c."voidedById"
WHERE c."establishmentId" = $1 AND c."closedAt" >= $2 AND c."closedAt" < $3
ORDER BY c."closedAt" DESC, c.id DESC
