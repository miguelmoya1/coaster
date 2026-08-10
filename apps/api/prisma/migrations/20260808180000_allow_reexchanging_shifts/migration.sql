-- A shift could only ever be exchanged once: the unique index made the second offer fail with a
-- driver error. Exchanges are now a history, with at most one of them pending per shift.
DROP INDEX "ShiftExchange_shiftId_key";

-- CreateIndex
CREATE INDEX "ShiftExchange_shiftId_idx" ON "ShiftExchange"("shiftId");

-- The "one pending offer per shift" rule used to lean on the app checking first; now the database
-- holds it, so two simultaneous offers cannot both get through.
CREATE UNIQUE INDEX "ShiftExchange_shiftId_pending_key" ON "ShiftExchange"("shiftId") WHERE status = 'PENDING';
