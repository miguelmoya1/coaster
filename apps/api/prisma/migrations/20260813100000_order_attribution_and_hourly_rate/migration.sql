-- Who opened the order. Nullable because every order taken before this migration has no author
-- to point at, and because an order outlives the staff member who rang it up.
ALTER TABLE "Order" ADD COLUMN "createdById" TEXT;

ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sales per staff member are always read within one establishment over a date range.
CREATE INDEX "Order_establishmentId_createdById_createdAt_idx"
  ON "Order"("establishmentId", "createdById", "createdAt");

-- What the member is paid per hour, in cents, to weigh hours worked against takings. Nullable:
-- a rate nobody has filled in must read as unknown, never as working for free.
ALTER TABLE "EstablishmentMember" ADD COLUMN "hourlyRateCents" INTEGER;
