-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "ProductTemplate" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "PrinterConfig" (
    "id" TEXT NOT NULL,
    "barId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "ipAddress" TEXT,
    "port" INTEGER NOT NULL DEFAULT 8080,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrinterConfig_barId_key" ON "PrinterConfig"("barId");

-- AddForeignKey
ALTER TABLE "PrinterConfig" ADD CONSTRAINT "PrinterConfig_barId_fkey" FOREIGN KEY ("barId") REFERENCES "Bar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
