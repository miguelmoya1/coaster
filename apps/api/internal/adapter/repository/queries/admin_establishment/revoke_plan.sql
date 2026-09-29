UPDATE "EstablishmentSubscription"
SET "manualPlan" = NULL,
    "manualGrantExpiresAt" = NULL,
    "manualGrantReason" = NULL,
    "manualGrantedById" = NULL,
    "manualGrantedAt" = NULL,
    "updatedAt" = $2
WHERE "establishmentId" = $1
