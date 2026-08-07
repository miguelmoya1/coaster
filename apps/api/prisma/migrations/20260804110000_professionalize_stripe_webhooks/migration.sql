ALTER TABLE "StripeWebhookEvent"
  ADD COLUMN "processingStatus" TEXT NOT NULL DEFAULT 'PROCESSED',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "StripeWebhookEvent"
  ALTER COLUMN "processedAt" DROP NOT NULL,
  ALTER COLUMN "processedAt" DROP DEFAULT;

UPDATE "StripeWebhookEvent"
SET
  "processingStatus" = 'PROCESSED',
  "attempts" = CASE WHEN "attempts" = 0 THEN 1 ELSE "attempts" END,
  "receivedAt" = COALESCE("processedAt", CURRENT_TIMESTAMP),
  "updatedAt" = COALESCE("processedAt", CURRENT_TIMESTAMP);

UPDATE "BarSubscription"
SET
  "plan" = 'FREE'::"SubscriptionPlan",
  "status" = CASE
    WHEN "trialEndsAt" IS NOT NULL AND "trialEndsAt" > CURRENT_TIMESTAMP
      THEN 'TRIALING'::"SubscriptionStatus"
    ELSE 'INACTIVE'::"SubscriptionStatus"
  END
WHERE "status" = 'ACTIVE'
  AND "stripeSubscriptionId" IS NULL;
