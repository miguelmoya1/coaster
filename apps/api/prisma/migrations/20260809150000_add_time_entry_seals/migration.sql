-- A daily record of where each bar's chain ended. The chain alone proves the entries are internally
-- consistent; it cannot prove somebody did not rebuild the whole thing from scratch, since a rebuilt
-- chain is consistent too. Sealing the head every day pins what the chain looked like on that date,
-- so a later rewrite has to disagree with a seal to go unnoticed.
CREATE TABLE "TimeEntrySeal" (
    "id" TEXT NOT NULL,
    "barId" TEXT NOT NULL,
    "sealedDate" DATE NOT NULL,
    "sequence" BIGINT NOT NULL,
    "headHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeEntrySeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntrySeal_barId_sealedDate_key" ON "TimeEntrySeal"("barId", "sealedDate");

-- CreateIndex
CREATE INDEX "TimeEntrySeal_barId_sealedDate_idx" ON "TimeEntrySeal"("barId", "sealedDate");

-- AddForeignKey
ALTER TABLE "TimeEntrySeal" ADD CONSTRAINT "TimeEntrySeal_barId_fkey" FOREIGN KEY ("barId") REFERENCES "Bar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The guard now names whichever table it fired on, so the seals can share it with the entries.
CREATE OR REPLACE FUNCTION "time_entry_append_only"() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

-- The seals are evidence in the same way the entries are, so the database refuses to change them too.
CREATE TRIGGER "time_entry_seal_no_update"
    BEFORE UPDATE ON "TimeEntrySeal"
    FOR EACH ROW EXECUTE FUNCTION "time_entry_append_only"();

CREATE TRIGGER "time_entry_seal_no_delete"
    BEFORE DELETE ON "TimeEntrySeal"
    FOR EACH ROW EXECUTE FUNCTION "time_entry_append_only"();
