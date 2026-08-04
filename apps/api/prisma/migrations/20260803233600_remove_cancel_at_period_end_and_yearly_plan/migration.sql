-- AlterEnum
BEGIN;
ALTER TABLE "BarSubscription" ALTER COLUMN "plan" DROP DEFAULT;
DROP TYPE IF EXISTS "SubscriptionPlan" CASCADE;
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');
ALTER TABLE "BarSubscription" ALTER COLUMN "plan" TYPE "SubscriptionPlan" USING (
  CASE 
    WHEN "plan"::text = 'PRO_MONTHLY' OR "plan"::text = 'PRO_YEARLY' THEN 'PRO'::"SubscriptionPlan"
    WHEN "plan"::text = 'PRO' THEN 'PRO'::"SubscriptionPlan"
    ELSE 'FREE'::"SubscriptionPlan"
  END
);
ALTER TABLE "BarSubscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';
COMMIT;

-- AlterTable
ALTER TABLE "BarSubscription" DROP COLUMN IF EXISTS "cancelAtPeriodEnd";
