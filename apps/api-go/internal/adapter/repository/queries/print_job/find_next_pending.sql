SELECT id, payload
FROM "PrintJob"
WHERE "establishmentId" = $1 AND status = 'PENDING'
ORDER BY "createdAt"
LIMIT 1
