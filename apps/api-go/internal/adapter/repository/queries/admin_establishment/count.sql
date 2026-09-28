SELECT count(*)
FROM "Establishment" e
LEFT JOIN "EstablishmentSubscription" s ON s."establishmentId" = e.id
WHERE ($1::text IS NULL
       OR e.id = $1
       OR e.name ILIKE ('%' || $1 || '%')
       OR EXISTS (SELECT 1
                  FROM "EstablishmentMember" m
                  JOIN "User" u ON u.id = m."userId"
                  WHERE m."establishmentId" = e.id AND m."deletedAt" IS NULL AND u.email ILIKE ('%' || $1 || '%')))
  AND ($2::text IS NULL OR s.status::text = $2)
  AND CASE $3::text
          WHEN 'MANUAL' THEN
              s."manualPlan" IS NOT NULL AND (s."manualGrantExpiresAt" IS NULL OR s."manualGrantExpiresAt" >= $4)
          WHEN 'STRIPE' THEN
              s."stripeSubscriptionId" IS NOT NULL
              AND NOT (s."manualPlan" IS NOT NULL AND (s."manualGrantExpiresAt" IS NULL OR s."manualGrantExpiresAt" >= $4))
          WHEN 'NONE' THEN
              s.id IS NULL
              OR (s."stripeSubscriptionId" IS NULL
                  AND NOT (s."manualPlan" IS NOT NULL AND (s."manualGrantExpiresAt" IS NULL OR s."manualGrantExpiresAt" >= $4)))
          ELSE true
      END
