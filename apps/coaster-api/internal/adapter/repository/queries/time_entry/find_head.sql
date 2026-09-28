SELECT sequence, hash
FROM "TimeEntry"
WHERE "establishmentId" = $1
ORDER BY sequence DESC
LIMIT 1
