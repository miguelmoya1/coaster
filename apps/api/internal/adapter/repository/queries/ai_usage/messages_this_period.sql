SELECT messages
FROM "AiUsage"
WHERE "establishmentId" = $1 AND period = $2
