INSERT INTO "PrinterConfig" (id, "establishmentId", "deviceKey", "updatedAt")
VALUES ($1, $2, $3, $4)
RETURNING "establishmentId", "deviceKey", "ipAddress", port, "lastSeenAt"
