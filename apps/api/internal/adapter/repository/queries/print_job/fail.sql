UPDATE "PrintJob"
SET status = 'FAILED', "completedAt" = $3, error = $2
WHERE id = $1 AND status = 'PRINTING'
