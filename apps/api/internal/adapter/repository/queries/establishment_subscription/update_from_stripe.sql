UPDATE "EstablishmentSubscription"
SET status = $2::"SubscriptionStatus",
    plan = $3::"SubscriptionPlan",
    "stripeSubscriptionId" = $4,
    seats = $5,
    "currentPeriodStart" = $6,
    "currentPeriodEnd" = $7,
    "trialEndsAt" = $8,
    "canceledAt" = $9,
    "updatedAt" = $10
WHERE "establishmentId" = $1
