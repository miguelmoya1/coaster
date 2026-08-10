-- v1 hashes left the workday and the identity snapshot outside the digest, so both could be edited
-- straight in the database without breaking the chain. Entries keep the version they were signed
-- with, because rewriting old hashes into the new shape would destroy what the chain is evidence of.
-- Only marks recorded from now on are signed with v2, which covers both fields.
ALTER TABLE "TimeEntry" ADD COLUMN "hashVersion" INTEGER NOT NULL DEFAULT 1;
