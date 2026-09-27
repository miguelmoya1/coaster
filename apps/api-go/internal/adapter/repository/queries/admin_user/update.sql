UPDATE "User"
SET role = COALESCE($2::"Role", role),
    active = COALESCE($3, active),
    "updatedAt" = $4
WHERE id = $1
