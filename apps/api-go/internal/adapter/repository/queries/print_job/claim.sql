UPDATE "PrintJob"
SET status = 'PRINTING', "claimedAt" = $2, attempts = attempts + 1
WHERE id = (
    SELECT id
    FROM "PrintJob"
    WHERE "establishmentId" = $1 AND status = 'PENDING'
    ORDER BY "createdAt"
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
RETURNING id, payload
