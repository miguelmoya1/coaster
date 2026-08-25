-- CreateEnum
CREATE TYPE "InvoiceRecordType" AS ENUM ('ALTA', 'ANULACION');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('F1', 'F2', 'F3', 'R1', 'R2', 'R3', 'R4', 'R5');

-- CreateEnum
CREATE TYPE "RectificationType" AS ENUM ('S', 'I');

-- CreateEnum
CREATE TYPE "AeatStatus" AS ENUM ('NOT_SENT', 'PENDING', 'ACCEPTED', 'ACCEPTED_WITH_ERRORS', 'REJECTED');

-- AlterTable
ALTER TABLE "Establishment" ADD COLUMN     "fiscalAddress" TEXT,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "taxId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productNameAtPurchase" TEXT,
ADD COLUMN     "taxRateAtPurchase" INTEGER NOT NULL DEFAULT 1000;

UPDATE "OrderItem" AS oi
SET "productNameAtPurchase" = p."name"
FROM "Product" AS p
WHERE p."id" = oi."productId" AND oi."productNameAtPurchase" IS NULL;

UPDATE "OrderItem"
SET "productNameAtPurchase" = ''
WHERE "productNameAtPurchase" IS NULL;

ALTER TABLE "OrderItem" ALTER COLUMN "productNameAtPurchase" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "taxCategory" TEXT,
ADD COLUMN     "taxRate" INTEGER NOT NULL DEFAULT 1000,
ALTER COLUMN "allergens" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "orderId" TEXT,
    "idVersion" TEXT NOT NULL,
    "recordType" "InvoiceRecordType" NOT NULL DEFAULT 'ALTA',
    "type" "InvoiceType" NOT NULL,
    "series" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "sequence" BIGINT NOT NULL,
    "issuerTaxId" TEXT NOT NULL,
    "issuerLegalName" TEXT NOT NULL,
    "issuerAddress" TEXT NOT NULL,
    "operationText" TEXT NOT NULL,
    "externalRef" TEXT,
    "customerTaxId" TEXT,
    "customerName" TEXT,
    "customerAddress" TEXT,
    "customerCountry" TEXT,
    "customerIdType" TEXT,
    "simplifiedArt7273" BOOLEAN NOT NULL DEFAULT false,
    "noCustomerIdArt61d" BOOLEAN NOT NULL DEFAULT false,
    "macrodato" BOOLEAN NOT NULL DEFAULT false,
    "issuedByThirdParty" TEXT,
    "thirdPartyTaxId" TEXT,
    "thirdPartyName" TEXT,
    "taxBaseTotal" INTEGER NOT NULL,
    "taxAmountTotal" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "hashType" TEXT NOT NULL DEFAULT '01',
    "prevSeries" TEXT,
    "prevNumber" INTEGER,
    "prevIssuedAt" TIMESTAMP(3),
    "isFirstRecord" BOOLEAN NOT NULL DEFAULT false,
    "softwareVersion" TEXT NOT NULL,
    "installationNumber" TEXT NOT NULL,
    "qrPayload" TEXT NOT NULL,
    "subsanacion" BOOLEAN NOT NULL DEFAULT false,
    "rechazoPrevio" BOOLEAN NOT NULL DEFAULT false,
    "aeatStatus" "AeatStatus" NOT NULL DEFAULT 'NOT_SENT',
    "aeatCsv" TEXT,
    "aeatRecordState" TEXT,
    "aeatErrorCode" TEXT,
    "aeatErrorText" TEXT,
    "aeatSentAt" TIMESTAMP(3),
    "aeatAttempts" INTEGER NOT NULL DEFAULT 0,
    "substitutesId" TEXT,
    "rectifiesId" TEXT,
    "rectificationType" "RectificationType",
    "rectifiedBase" INTEGER,
    "rectifiedTaxAmount" INTEGER,
    "cancelsId" TEXT,
    "noPreviousRecord" BOOLEAN NOT NULL DEFAULT false,
    "generatedBy" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "operationDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceTaxLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "taxType" TEXT NOT NULL DEFAULT '01',
    "regimeKey" TEXT NOT NULL DEFAULT '01',
    "qualification" TEXT,
    "exemption" TEXT,
    "taxRate" INTEGER NOT NULL,
    "taxBase" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL,

    CONSTRAINT "InvoiceTaxLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAuditLog" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_substitutesId_key" ON "Invoice"("substitutesId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_rectifiesId_key" ON "Invoice"("rectifiesId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_cancelsId_key" ON "Invoice"("cancelsId");

-- CreateIndex
CREATE INDEX "Invoice_establishmentId_issuedAt_idx" ON "Invoice"("establishmentId", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_establishmentId_aeatStatus_idx" ON "Invoice"("establishmentId", "aeatStatus");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_establishmentId_series_number_key" ON "Invoice"("establishmentId", "series", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_establishmentId_series_sequence_key" ON "Invoice"("establishmentId", "series", "sequence");

-- CreateIndex
CREATE INDEX "InvoiceTaxLine_invoiceId_idx" ON "InvoiceTaxLine"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceTaxLine_invoiceId_taxRate_regimeKey_key" ON "InvoiceTaxLine"("invoiceId", "taxRate", "regimeKey");

-- CreateIndex
CREATE INDEX "OrderAuditLog_establishmentId_createdAt_idx" ON "OrderAuditLog"("establishmentId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderAuditLog_targetType_targetId_createdAt_idx" ON "OrderAuditLog"("targetType", "targetId", "createdAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_substitutesId_fkey" FOREIGN KEY ("substitutesId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_rectifiesId_fkey" FOREIGN KEY ("rectifiesId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_cancelsId_fkey" FOREIGN KEY ("cancelsId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceTaxLine" ADD CONSTRAINT "InvoiceTaxLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAuditLog" ADD CONSTRAINT "OrderAuditLog_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAuditLog" ADD CONSTRAINT "OrderAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

