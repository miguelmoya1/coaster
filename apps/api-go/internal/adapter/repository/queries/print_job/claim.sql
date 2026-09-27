UPDATE "PrintJob"
SET status = 'PRINTING', "claimedAt" = $2, attempts = attempts + 1
WHERE id = $1 AND status = 'PENDING'
