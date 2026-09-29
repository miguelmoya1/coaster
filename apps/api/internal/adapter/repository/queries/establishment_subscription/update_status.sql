UPDATE "EstablishmentSubscription"
SET status = $2::"SubscriptionStatus", "updatedAt" = $3
WHERE "establishmentId" = $1
