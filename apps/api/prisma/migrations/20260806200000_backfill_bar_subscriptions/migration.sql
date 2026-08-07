-- Bars created before the billing module have no BarSubscription row, and SubscriptionActiveGuard
-- reads a missing row as "no subscription" and rejects every write with 402. Give each one the same
-- 14-day trial a bar created today gets, counted from the moment this migration runs, so existing
-- customers keep working and have a window to subscribe.
INSERT INTO "BarSubscription" (
  "id",
  "barId",
  "plan",
  "status",
  "trialEndsAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  b."id",
  'FREE'::"SubscriptionPlan",
  'TRIALING'::"SubscriptionStatus",
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Bar" b
WHERE NOT EXISTS (
  SELECT 1 FROM "BarSubscription" s WHERE s."barId" = b."id"
);
