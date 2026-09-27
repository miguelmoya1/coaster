INSERT INTO "PrinterConfig" (id, "establishmentId", "deviceKey", "ipAddress", port, "lastSeenAt", "updatedAt")
VALUES ($1, $2, $3, $4, COALESCE($5::integer, 8080), $6, $6)
ON CONFLICT ("establishmentId") DO UPDATE
SET "ipAddress" = EXCLUDED."ipAddress",
    port = COALESCE($5::integer, "PrinterConfig".port),
    "lastSeenAt" = EXCLUDED."lastSeenAt",
    "updatedAt" = EXCLUDED."updatedAt"
