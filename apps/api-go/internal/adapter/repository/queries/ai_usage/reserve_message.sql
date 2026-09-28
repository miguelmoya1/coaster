INSERT INTO "AiUsage" (id, "establishmentId", period, messages, "updatedAt")
VALUES ($1, $2, $3, 1, $5)
ON CONFLICT ("establishmentId", period)
DO UPDATE SET messages = "AiUsage".messages + 1, "updatedAt" = $5
WHERE "AiUsage".messages < $4
RETURNING messages
