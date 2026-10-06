SELECT count(*),
       count(*) FILTER (WHERE active),
       count(*) FILTER (WHERE role = 'ADMIN' AND active),
       count(*) FILTER (WHERE "createdAt" >= $1)
FROM "User"
