-- A line taken off the menu without losing its wording, for a dish that is off today.
ALTER TABLE "MenuItem" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- Whether running out should say so on the menu. Off by default: a venue that does not keep its
-- stock honest would be telling customers a dish is gone when it is not.
ALTER TABLE "EstablishmentSettings" ADD COLUMN "markSoldOut" BOOLEAN NOT NULL DEFAULT false;
