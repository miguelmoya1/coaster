SELECT id, "establishmentId", status::text, error, "createdAt", "completedAt"
FROM "PrintJob"
WHERE id = $1
