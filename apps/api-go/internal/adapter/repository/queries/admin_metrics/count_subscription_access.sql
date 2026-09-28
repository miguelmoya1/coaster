-- live_grant is a manual paid plan that has not ended; live_stripe a paid period, a trial or a
-- cancelled period that has not ended.
SELECT count(*) FILTER (WHERE live_grant),
       count(*) FILTER (WHERE live_stripe AND NOT live_grant),
       count(*) FILTER (WHERE live_grant OR live_stripe)
FROM (
    SELECT "manualPlan" IS NOT NULL AND "manualPlan" <> 'FREE' AND ("manualGrantExpiresAt" IS NULL OR "manualGrantExpiresAt" >= $1) AS live_grant,
           COALESCE(
               (status = 'ACTIVE' AND "stripeSubscriptionId" IS NOT NULL AND "currentPeriodEnd" >= $1)
               OR (status = 'TRIALING' AND "trialEndsAt" >= $1)
               OR (status = 'CANCELED' AND "currentPeriodEnd" >= $1),
               false
           ) AS live_stripe
    FROM "EstablishmentSubscription"
) subscription
