UPDATE "Order"
SET notes         = CASE WHEN $2::boolean THEN $3::text ELSE notes END,
    "ticketNotes" = CASE WHEN $4::boolean THEN $5::text ELSE "ticketNotes" END,
    "updatedAt"   = $6
WHERE id = $1
