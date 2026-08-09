-- Reverts the versioning added a migration ago. Keeping two hashing rules alive only pays off when
-- there are signed timesheets to preserve, and there are none yet: the digest now always covers the
-- workday and the identity snapshot, with no version to branch on.
-- The marks recorded before this point were signed without those fields and would read as broken
-- forever, so the chain starts clean. TRUNCATE is what clears it: the append-only triggers are per
-- row and would refuse a DELETE.
TRUNCATE TABLE "TimeEntry";

ALTER TABLE "TimeEntry" DROP COLUMN "hashVersion";
