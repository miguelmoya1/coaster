SELECT s.id, s."startTime", s."endTime", s."userId", u.name, u."photoUrl", s."establishmentId", s.notes
FROM "Shift" s
JOIN "User" u ON u.id = s."userId"
WHERE s.id = $1
