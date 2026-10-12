SELECT count(*)
FROM "User" u
WHERE ($1::text IS NULL OR u.id = $1 OR u.name ILIKE ('%' || $1 || '%') OR u.email ILIKE ('%' || $1 || '%'))
  AND ($2::text IS NULL OR u.role::text = $2)
  AND ($3::boolean IS NULL OR u.active = $3)
