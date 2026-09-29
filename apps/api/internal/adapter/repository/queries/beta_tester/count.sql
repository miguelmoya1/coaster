SELECT count(*)
FROM "BetaTester" b
WHERE $1::text IS NULL OR b.email ILIKE ('%' || $1 || '%') OR b.note ILIKE ('%' || $1 || '%')
