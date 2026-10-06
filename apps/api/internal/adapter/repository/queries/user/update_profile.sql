UPDATE "User"
SET name = COALESCE($2::text, name),
    "photoUrl" = CASE WHEN $4::boolean THEN NULL ELSE COALESCE($3::text, "photoUrl") END,
    "updatedAt" = $5
WHERE id = $1
