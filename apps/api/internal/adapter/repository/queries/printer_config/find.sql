SELECT "establishmentId", "deviceKey", "ipAddress", port, "lastSeenAt"
FROM "PrinterConfig"
WHERE "establishmentId" = $1
