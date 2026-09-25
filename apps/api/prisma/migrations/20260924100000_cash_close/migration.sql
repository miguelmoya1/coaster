-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cashCloseId" TEXT;

-- CreateTable
CREATE TABLE "CashClose" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "closedById" TEXT NOT NULL,
    "since" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedOrders" INTEGER NOT NULL,
    "cancelledOrders" INTEGER NOT NULL,
    "cancelledAmount" INTEGER NOT NULL,
    "cashAmount" INTEGER NOT NULL,
    "cardAmount" INTEGER NOT NULL,
    "tipAmount" INTEGER NOT NULL,
    "openingFloat" INTEGER NOT NULL,
    "countedCash" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "CashClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashClose_establishmentId_closedAt_idx" ON "CashClose"("establishmentId", "closedAt");

-- CreateIndex
CREATE INDEX "Order_cashCloseId_idx" ON "Order"("cashCloseId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashCloseId_fkey" FOREIGN KEY ("cashCloseId") REFERENCES "CashClose"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClose" ADD CONSTRAINT "CashClose_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashClose" ADD CONSTRAINT "CashClose_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

