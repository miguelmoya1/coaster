-- What tells the app an establishment has never been set up. It cannot be "has no settings row",
-- because creation writes one straight away; it has to be something the owner does.
--
-- Every establishment that already exists has been in use for a while, so it counts as configured
-- and must never be shown the onboarding dialog.

ALTER TABLE "EstablishmentSettings" ADD COLUMN "configuredAt" TIMESTAMP(3);

UPDATE "EstablishmentSettings" SET "configuredAt" = "createdAt";
