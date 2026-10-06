UPDATE "PrintJob"
SET status = 'PRINTED', "completedAt" = $2, error = NULL
WHERE id = $1 AND status = 'PRINTING'
