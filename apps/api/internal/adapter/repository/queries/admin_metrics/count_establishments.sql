SELECT count(*),
       count(*) FILTER (WHERE "createdAt" >= $1),
       count(*) FILTER (WHERE "createdAt" >= $2)
FROM "Establishment"
