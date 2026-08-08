-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "barId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userSnapshot" JSONB NOT NULL,
    "shiftId" TEXT,
    "type" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "workdayDate" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "rootId" TEXT NOT NULL,
    "supersedesId" TEXT,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "sequence" BIGINT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_supersedesId_key" ON "TimeEntry"("supersedesId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_barId_sequence_key" ON "TimeEntry"("barId", "sequence");

-- CreateIndex
CREATE INDEX "TimeEntry_rootId_idx" ON "TimeEntry"("rootId");

-- CreateIndex
CREATE INDEX "TimeEntry_barId_userId_workdayDate_idx" ON "TimeEntry"("barId", "userId", "workdayDate");

-- CreateIndex
CREATE INDEX "TimeEntry_barId_workdayDate_idx" ON "TimeEntry"("barId", "workdayDate");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_barId_fkey" FOREIGN KEY ("barId") REFERENCES "Bar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "TimeEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The chain is append-only by contract; these triggers make the database enforce it.
CREATE OR REPLACE FUNCTION "time_entry_append_only"() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'TimeEntry is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "time_entry_no_update"
    BEFORE UPDATE ON "TimeEntry"
    FOR EACH ROW EXECUTE FUNCTION "time_entry_append_only"();

CREATE TRIGGER "time_entry_no_delete"
    BEFORE DELETE ON "TimeEntry"
    FOR EACH ROW EXECUTE FUNCTION "time_entry_append_only"();
