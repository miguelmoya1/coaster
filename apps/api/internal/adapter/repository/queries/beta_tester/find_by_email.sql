SELECT b.id, b.email, b.note, b."createdAt", u.name
FROM "BetaTester" b
LEFT JOIN "User" u ON u.id = b."invitedById"
WHERE b.email = $1
