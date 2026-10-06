UPDATE "PrinterConfig"
SET "deviceKey" = $2, "updatedAt" = $3
WHERE "establishmentId" = $1
