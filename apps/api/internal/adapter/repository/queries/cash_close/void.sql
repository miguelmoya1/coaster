UPDATE "CashClose"
SET "voidedAt" = $2, "voidedById" = $3
WHERE id = $1
