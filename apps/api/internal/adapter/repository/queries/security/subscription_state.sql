SELECT status::text, "stripeSubscriptionId", "currentPeriodEnd", "trialEndsAt", "manualPlan"::text, "manualGrantExpiresAt"
FROM "EstablishmentSubscription"
WHERE "establishmentId" = $1
