SELECT b.id, b.email, b.note, b."createdAt", u.name
FROM "BetaTester" b
LEFT JOIN "User" u ON u.id = b."invitedById"
WHERE $1::text IS NULL OR b.email ILIKE ('%' || $1 || '%') OR b.note ILIKE ('%' || $1 || '%')
ORDER BY b."createdAt" DESC
LIMIT $2 OFFSET $3
