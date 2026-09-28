SELECT u.id, u.name, u.email, u."photoUrl", u.role::text, u.active, p.language, u."createdAt",
       (SELECT count(*) FROM "EstablishmentMember" m WHERE m."userId" = u.id AND m.active AND m."deletedAt" IS NULL)
FROM "User" u
LEFT JOIN "UserPreferences" p ON p."userId" = u.id
WHERE ($1::text IS NULL OR u.id = $1 OR u.name ILIKE ('%' || $1 || '%') OR u.email ILIKE ('%' || $1 || '%'))
  AND ($2::text IS NULL OR u.role::text = $2)
  AND ($3::boolean IS NULL OR u.active = $3)
ORDER BY u."createdAt" DESC
LIMIT $4 OFFSET $5
