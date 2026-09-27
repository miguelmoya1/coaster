SELECT e.id, e.name, e."createdAt",
       (SELECT count(*) FROM "EstablishmentMember" m WHERE m."establishmentId" = e.id),
       owner.name, owner.email,
       s.id, s.plan::text, s.status::text, s."stripeCustomerId", s."stripeSubscriptionId", s."currentPeriodStart",
       s."currentPeriodEnd", s."trialEndsAt", s."canceledAt", s.seats, s."manualPlan"::text, s."manualGrantExpiresAt",
       s."manualGrantReason", s."manualGrantedById", s."manualGrantedAt", s."createdAt", s."updatedAt"
FROM "Establishment" e
LEFT JOIN "EstablishmentSubscription" s ON s."establishmentId" = e.id
LEFT JOIN LATERAL (
    SELECT u.name, u.email
    FROM "EstablishmentMember" m
    JOIN "User" u ON u.id = m."userId"
    WHERE m."establishmentId" = e.id AND m.role = 'OWNER' AND m.active AND m."deletedAt" IS NULL
    ORDER BY m."createdAt"
    LIMIT 1
) owner ON true
WHERE e.id = $1
