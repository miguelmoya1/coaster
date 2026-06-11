-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MIXED', 'NONE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "amountPaidCard" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "amountPaidCash" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "paidQuantityCard" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paidQuantityCash" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'NONE';
