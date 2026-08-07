-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "BarSubscription" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
