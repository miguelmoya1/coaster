INSERT INTO "EstablishmentSubscription" (id, "establishmentId", plan, status, "trialEndsAt", "createdAt", "updatedAt")
VALUES ($1, $2, 'FREE', 'TRIALING', $3, $4, $4)
