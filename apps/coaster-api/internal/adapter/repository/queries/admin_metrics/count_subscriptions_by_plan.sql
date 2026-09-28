SELECT plan::text, count(*)
FROM "EstablishmentSubscription"
GROUP BY plan
