-- AlterEnum
ALTER TABLE "BarSubscription" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TYPE "SubscriptionPlan" RENAME TO "SubscriptionPlan_old";
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');
ALTER TABLE "BarSubscription" ALTER COLUMN "plan" TYPE "SubscriptionPlan" USING (
  CASE 
    WHEN "plan"::text = 'PRO_MONTHLY' OR "plan"::text = 'PRO_YEARLY' THEN 'PRO'::"SubscriptionPlan"
    WHEN "plan"::text = 'PRO' THEN 'PRO'::"SubscriptionPlan"
    ELSE 'FREE'::"SubscriptionPlan"
  END
);
ALTER TABLE "BarSubscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';
DROP TYPE "SubscriptionPlan_old";

-- AlterTable
ALTER TABLE "BarSubscription" DROP COLUMN IF EXISTS "cancelAtPeriodEnd";
