SELECT id, "establishmentId", plan::text, status::text, "stripeCustomerId", "stripeSubscriptionId", "currentPeriodStart",
       "currentPeriodEnd", "trialEndsAt", "canceledAt", seats, "manualPlan"::text, "manualGrantExpiresAt", "createdAt", "updatedAt"
FROM "EstablishmentSubscription"
WHERE "stripeSubscriptionId" = $1
