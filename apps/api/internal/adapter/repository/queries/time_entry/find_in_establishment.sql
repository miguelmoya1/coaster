SELECT te.id, te."establishmentId", te."userId", u.name, te."userSnapshot", te."shiftId", te.type, te.action,
       te."occurredAt", te."recordedAt", te."workdayDate", te.source, te.latitude, te.longitude, te."rootId",
       te."supersedesId", te."actorId", a.name, te.reason, te.sequence, te."prevHash", te.hash
FROM "TimeEntry" te
JOIN "User" u ON u.id = te."userId"
JOIN "User" a ON a.id = te."actorId"
WHERE te.id = $1 AND te."establishmentId" = $2
