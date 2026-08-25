CREATE TEMP TABLE order_recalc AS
SELECT o."id",
       o."totalAmount" AS old_total,
       o."amountPaidCash" + o."amountPaidCard" AS paid,
       SUM(oi."quantity" * oi."priceAtPurchase")
         + SUM(ROUND(oi."quantity" * oi."priceAtPurchase" * oi."taxRateAtPurchase" / 10000.0)) AS new_total
FROM "Order" AS o
JOIN "OrderItem" AS oi ON oi."orderId" = o."id"
GROUP BY o."id", o."totalAmount", o."amountPaidCash", o."amountPaidCard";

UPDATE "Order" AS o
SET "totalAmount" = r.new_total
FROM order_recalc AS r
WHERE r."id" = o."id";

UPDATE "Order" AS o
SET "amountPaidCash" = o."amountPaidCash" + (r.new_total - r.paid)
FROM order_recalc AS r
WHERE r."id" = o."id"
  AND o."status" = 'CLOSED'
  AND r.paid >= r.old_total
  AND r.paid <> r.new_total;

DROP TABLE order_recalc;
