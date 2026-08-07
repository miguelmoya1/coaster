-- AlterTable
ALTER TABLE "BarSubscription"
    ADD COLUMN "manualPlan" "SubscriptionPlan",
    ADD COLUMN "manualGrantExpiresAt" TIMESTAMP(3),
    ADD COLUMN "manualGrantReason" TEXT,
    ADD COLUMN "manualGrantedById" TEXT,
    ADD COLUMN "manualGrantedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BarSubscription_manualPlan_idx" ON "BarSubscription"("manualPlan");

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx" ON "AdminAuditLog"("targetType", "targetId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
