SELECT status::text, count(*)
FROM "EstablishmentSubscription"
GROUP BY status
