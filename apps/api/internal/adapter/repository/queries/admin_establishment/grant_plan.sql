INSERT INTO "EstablishmentSubscription" (
    id, "establishmentId", "manualPlan", "manualGrantExpiresAt", "manualGrantReason", "manualGrantedById",
    "manualGrantedAt", "createdAt", "updatedAt"
)
VALUES ($1, $2, $3::"SubscriptionPlan", $4, $5, $6, $7, $7, $7)
ON CONFLICT ("establishmentId") DO UPDATE SET
    "manualPlan" = EXCLUDED."manualPlan",
    "manualGrantExpiresAt" = EXCLUDED."manualGrantExpiresAt",
    "manualGrantReason" = EXCLUDED."manualGrantReason",
    "manualGrantedById" = EXCLUDED."manualGrantedById",
    "manualGrantedAt" = EXCLUDED."manualGrantedAt",
    "updatedAt" = EXCLUDED."updatedAt"
