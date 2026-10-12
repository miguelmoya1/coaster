UPDATE "EstablishmentSubscription"
SET status = $2::"SubscriptionStatus",
    "stripeSubscriptionId" = $3,
    seats = $4,
    "currentPeriodStart" = $5,
    "currentPeriodEnd" = $6,
    "trialEndsAt" = $7,
    "canceledAt" = $8,
    "updatedAt" = $9
WHERE "establishmentId" = $1
