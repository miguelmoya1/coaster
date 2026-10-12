UPDATE "EstablishmentSubscription"
SET "stripeCustomerId" = NULL, "updatedAt" = $3
WHERE "stripeCustomerId" = $1 AND "establishmentId" <> $2
RETURNING "establishmentId"
