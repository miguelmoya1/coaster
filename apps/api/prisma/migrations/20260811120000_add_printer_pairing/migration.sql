-- Pairing a printer bridge without a console. The customer downloads a binary already named with
-- one of these codes, and the bridge redeems it on first run for the ids it needs.
--
-- One use, short lived: the code travels in a filename, which is the least private place a secret
-- can live, so it is worth nothing the moment it has been spent.

CREATE TABLE "PrinterPairing" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrinterPairing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrinterPairing_code_key" ON "PrinterPairing"("code");
CREATE INDEX "PrinterPairing_establishmentId_idx" ON "PrinterPairing"("establishmentId");

ALTER TABLE "PrinterPairing" ADD CONSTRAINT "PrinterPairing_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
