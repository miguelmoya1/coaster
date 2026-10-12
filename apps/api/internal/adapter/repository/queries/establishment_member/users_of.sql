SELECT u.id, u.name, u.email, u."photoUrl", u."passwordUpdatedAt",
       (SELECT count(*) FROM "AuthIdentity" i WHERE i."userId" = u.id)
FROM "User" u
WHERE u.id = ANY($1)
