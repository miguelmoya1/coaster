SELECT count(*)
FROM "Establishment" e
LEFT JOIN "EstablishmentSubscription" s ON s."establishmentId" = e.id
CROSS JOIN LATERAL (
    SELECT s."manualPlan" IS NOT NULL AND s."manualPlan" <> 'FREE'
               AND (s."manualGrantExpiresAt" IS NULL OR s."manualGrantExpiresAt" >= $4) AS live_grant,
           COALESCE(
               (s.status = 'ACTIVE' AND s."stripeSubscriptionId" <> '' AND s."currentPeriodEnd" >= $4)
               OR (s.status = 'TRIALING' AND s."trialEndsAt" >= $4)
               OR (s.status = 'CANCELED' AND s."currentPeriodEnd" >= $4)
               OR s.status = 'PAST_DUE',
               false
           ) AS live_stripe
) access
WHERE ($1::text IS NULL
       OR e.id = $1
       OR e.name ILIKE ('%' || $1 || '%')
       OR EXISTS (SELECT 1
                  FROM "EstablishmentMember" m
                  JOIN "User" u ON u.id = m."userId"
                  WHERE m."establishmentId" = e.id AND m."deletedAt" IS NULL AND u.email ILIKE ('%' || $1 || '%')))
  AND ($2::text IS NULL OR s.status::text = $2)
  AND CASE $3::text
          WHEN 'MANUAL' THEN access.live_grant
          WHEN 'STRIPE' THEN access.live_stripe AND NOT access.live_grant
          WHEN 'NONE' THEN NOT access.live_grant AND NOT access.live_stripe
          ELSE true
      END
