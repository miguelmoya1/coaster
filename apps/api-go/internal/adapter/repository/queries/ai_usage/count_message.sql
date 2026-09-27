INSERT INTO "AiUsage" (id, "establishmentId", period, messages, "updatedAt")
VALUES ($1, $2, $3, 1, $4)
ON CONFLICT ("establishmentId", period)
DO UPDATE SET messages = "AiUsage".messages + 1, "updatedAt" = $4
RETURNING messages
