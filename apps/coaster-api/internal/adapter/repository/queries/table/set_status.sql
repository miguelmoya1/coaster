UPDATE "Table"
SET status = $2::"TableStatus", "updatedAt" = $3
WHERE id = $1
