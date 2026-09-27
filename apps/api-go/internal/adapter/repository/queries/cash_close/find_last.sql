SELECT "closedAt", "openingFloat"
FROM "CashClose"
WHERE "establishmentId" = $1
ORDER BY "closedAt" DESC
LIMIT 1
