UPDATE "PrinterPairing"
SET "redeemedAt" = $2
WHERE code = $1 AND "redeemedAt" IS NULL AND "expiresAt" > $2
RETURNING "establishmentId"
