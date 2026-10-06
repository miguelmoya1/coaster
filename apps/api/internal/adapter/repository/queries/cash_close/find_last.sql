SELECT id, "closedAt", "openingFloat"
FROM "CashClose"
WHERE "establishmentId" = $1 AND "voidedAt" IS NULL
ORDER BY "closedAt" DESC, id DESC
LIMIT 1
