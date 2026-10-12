SELECT u.id, u.email, u.name, u."photoUrl", u."passwordHash", u."emailVerifiedAt", u.active, u.role::text, p.language
FROM "User" u
LEFT JOIN "UserPreferences" p ON p."userId" = u.id
WHERE u.id = $1
