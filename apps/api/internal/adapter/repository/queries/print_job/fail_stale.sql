UPDATE "PrintJob"
SET status = 'FAILED', "completedAt" = $4, error = $5
WHERE "establishmentId" = $1 AND status = 'PRINTING' AND "claimedAt" < $2 AND attempts >= $3
