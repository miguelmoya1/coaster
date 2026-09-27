UPDATE "PrintJob"
SET status = 'PENDING', "claimedAt" = NULL
WHERE "establishmentId" = $1 AND status = 'PRINTING' AND "claimedAt" < $2 AND attempts < $3
