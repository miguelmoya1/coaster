INSERT INTO "EstablishmentSubscription" (
    id, "establishmentId", plan, status, "stripeCustomerId", "stripeSubscriptionId", "createdAt", "updatedAt"
)
VALUES ($1, $2, $3::"SubscriptionPlan", $4::"SubscriptionStatus", $5, $6, $7, $7)
ON CONFLICT ("establishmentId") DO UPDATE SET
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    "stripeCustomerId" = EXCLUDED."stripeCustomerId",
    "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
    "updatedAt" = EXCLUDED."updatedAt"
