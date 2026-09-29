UPDATE "PrinterConfig"
SET "lastSeenAt" = $2, "updatedAt" = $2
WHERE "establishmentId" = $1
