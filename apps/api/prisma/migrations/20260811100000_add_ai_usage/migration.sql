-- What one establishment has asked the assistant this month. The context budget caps what a single
-- message costs; this caps how many of them a flat monthly fee has to cover.

CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUsage_establishmentId_period_key" ON "AiUsage"("establishmentId", "period");

ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
