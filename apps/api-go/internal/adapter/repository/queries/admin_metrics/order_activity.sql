SELECT count(*),
       COALESCE(sum("totalAmount") FILTER (WHERE status = 'CLOSED'), 0)
FROM "Order"
WHERE "createdAt" >= $1
