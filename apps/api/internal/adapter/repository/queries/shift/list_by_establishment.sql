SELECT s.id, s."startTime", s."endTime", s."userId", u.name, u."photoUrl", s."establishmentId", s.notes
FROM "Shift" s
JOIN "User" u ON u.id = s."userId"
WHERE s."establishmentId" = $1
  AND ($2::timestamp(3) IS NULL OR (s."startTime" >= $2 AND s."startTime" <= $3::timestamp(3)))
ORDER BY s."startTime"
