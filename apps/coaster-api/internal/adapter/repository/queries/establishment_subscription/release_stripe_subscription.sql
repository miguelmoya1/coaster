UPDATE "EstablishmentSubscription"
SET "stripeSubscriptionId" = NULL, "updatedAt" = $3
WHERE "stripeSubscriptionId" = $1 AND "establishmentId" <> $2
RETURNING "establishmentId"
