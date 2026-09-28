UPDATE "AiUsage"
SET messages = messages - 1, "updatedAt" = $3
WHERE "establishmentId" = $1 AND period = $2 AND messages > 0
