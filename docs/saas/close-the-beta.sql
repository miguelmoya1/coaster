-- Closing the beta on an environment that has been open.
-- Run the SELECTs first and read them. Only the last statement writes.

-- 1. Who is registered today, and how much they use it.
SELECT
  u.email,
  u.role,
  u.active,
  u."createdAt"::date AS since,
  count(DISTINCT m."establishmentId") FILTER (WHERE m."deletedAt" IS NULL) AS venues,
  count(DISTINCT o.id) AS orders
FROM "User" u
LEFT JOIN "EstablishmentMember" m ON m."userId" = u.id
LEFT JOIN "Order" o ON o."createdById" = u.id
GROUP BY u.id
ORDER BY orders DESC, venues DESC, u."createdAt";

-- 2. Put the people who stay on the allowlist. One row each, lower case.
INSERT INTO "BetaTester" (id, email, note)
VALUES
  (gen_random_uuid()::text, lower('tester1@bar.com'), 'Bar Pepe'),
  (gen_random_uuid()::text, lower('tester2@bar.com'), 'Cafe Luna')
ON CONFLICT (email) DO NOTHING;

-- 3. Dry run: who would lose access. Employees of an allowlisted owner are kept,
--    otherwise closing the beta would break the venues you are keeping.
SELECT u.email, u.role, u."createdAt"::date AS since
FROM "User" u
WHERE u.active
  AND u.role <> 'ADMIN'
  AND lower(u.email) NOT IN (SELECT email FROM "BetaTester")
  AND NOT EXISTS (
    SELECT 1
    FROM "EstablishmentMember" m
    JOIN "EstablishmentMember" owner
      ON owner."establishmentId" = m."establishmentId"
     AND owner.role = 'OWNER'
     AND owner."deletedAt" IS NULL
    JOIN "User" ou ON ou.id = owner."userId"
    WHERE m."userId" = u.id
      AND m."deletedAt" IS NULL
      AND lower(ou.email) IN (SELECT email FROM "BetaTester")
  )
ORDER BY u."createdAt";

-- 4. The write. Same condition as the dry run above.
UPDATE "User" u
SET active = false
WHERE u.active
  AND u.role <> 'ADMIN'
  AND lower(u.email) NOT IN (SELECT email FROM "BetaTester")
  AND NOT EXISTS (
    SELECT 1
    FROM "EstablishmentMember" m
    JOIN "EstablishmentMember" owner
      ON owner."establishmentId" = m."establishmentId"
     AND owner.role = 'OWNER'
     AND owner."deletedAt" IS NULL
    JOIN "User" ou ON ou.id = owner."userId"
    WHERE m."userId" = u.id
      AND m."deletedAt" IS NULL
      AND lower(ou.email) IN (SELECT email FROM "BetaTester")
  );
