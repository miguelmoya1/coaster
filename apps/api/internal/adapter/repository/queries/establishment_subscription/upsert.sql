INSERT INTO "EstablishmentSubscription" (
    id, "establishmentId", plan, status, "stripeCustomerId", "stripeSubscriptionId", seats,
    "currentPeriodStart", "currentPeriodEnd", "trialEndsAt", "canceledAt", "createdAt", "updatedAt"
)
VALUES ($1, $2, $3::"SubscriptionPlan", $4::"SubscriptionStatus", $5, $6, $7, $8, $9, $10, $11, $12, $12)
ON CONFLICT ("establishmentId") DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    "stripeCustomerId" = EXCLUDED."stripeCustomerId",
    "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
    seats = EXCLUDED.seats,
    "currentPeriodStart" = EXCLUDED."currentPeriodStart",
    "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
    "trialEndsAt" = EXCLUDED."trialEndsAt",
    "canceledAt" = EXCLUDED."canceledAt",
    "updatedAt" = EXCLUDED."updatedAt"
