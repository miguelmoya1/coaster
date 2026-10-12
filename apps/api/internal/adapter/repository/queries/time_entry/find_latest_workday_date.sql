SELECT "workdayDate"
FROM "TimeEntry"
WHERE "establishmentId" = $1 AND "userId" = $2
ORDER BY "workdayDate" DESC
LIMIT 1
