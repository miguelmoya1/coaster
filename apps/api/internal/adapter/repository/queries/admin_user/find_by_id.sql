SELECT u.id, u.name, u.email, u."photoUrl", u.role::text, u.active, p.language, u."createdAt",
       (SELECT count(*) FROM "EstablishmentMember" m WHERE m."userId" = u.id AND m.active AND m."deletedAt" IS NULL)
FROM "User" u
LEFT JOIN "UserPreferences" p ON p."userId" = u.id
WHERE u.id = $1
