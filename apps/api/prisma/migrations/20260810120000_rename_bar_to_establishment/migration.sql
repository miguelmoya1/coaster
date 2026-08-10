-- Widen the aggregate root from a bar to any establishment: the working-time register is a legal
-- obligation for every employer, not only for hospitality.
--
-- Every statement here is a catalogue rename, so it is metadata-only and effectively instant. The
-- append-only triggers on TimeEntry never name the column in their bodies, so they carry over
-- untouched. Order matters: columns, then constraints and indexes, then the tables themselves, so
-- that no statement refers to a name that has already moved.

-- Enum
ALTER TYPE "BarRole" RENAME TO "EstablishmentRole";

-- Columns
ALTER TABLE "BarMember" RENAME COLUMN "barId" TO "establishmentId";
ALTER TABLE "BarSubscription" RENAME COLUMN "barId" TO "establishmentId";
ALTER TABLE "Category" RENAME COLUMN "barId" TO "establishmentId";
ALTER TABLE "Order" RENAME COLUMN "barId" TO "establishmentId";
ALTER TABLE "PrintJob" RENAME COLUMN "barId" TO "establishmentId";
ALTER TABLE "PrinterConfig" RENAME COLUMN "barId" TO "establishmentId";
ALTER TABLE "Shift" RENAME COLUMN "barId" TO "establishmentId";
ALTER TABLE "Table" RENAME COLUMN "barId" TO "establishmentId";
ALTER TABLE "TimeEntry" RENAME COLUMN "barId" TO "establishmentId";

-- Foreign keys
ALTER TABLE "BarMember" RENAME CONSTRAINT "BarMember_barId_fkey" TO "EstablishmentMember_establishmentId_fkey";
ALTER TABLE "BarMember" RENAME CONSTRAINT "BarMember_userId_fkey" TO "EstablishmentMember_userId_fkey";
ALTER TABLE "BarSubscription" RENAME CONSTRAINT "BarSubscription_barId_fkey" TO "EstablishmentSubscription_establishmentId_fkey";
ALTER TABLE "Category" RENAME CONSTRAINT "Category_barId_fkey" TO "Category_establishmentId_fkey";
ALTER TABLE "Order" RENAME CONSTRAINT "Order_barId_fkey" TO "Order_establishmentId_fkey";
ALTER TABLE "PrintJob" RENAME CONSTRAINT "PrintJob_barId_fkey" TO "PrintJob_establishmentId_fkey";
ALTER TABLE "PrinterConfig" RENAME CONSTRAINT "PrinterConfig_barId_fkey" TO "PrinterConfig_establishmentId_fkey";
ALTER TABLE "Shift" RENAME CONSTRAINT "Shift_barId_fkey" TO "Shift_establishmentId_fkey";
ALTER TABLE "Table" RENAME CONSTRAINT "Table_barId_fkey" TO "Table_establishmentId_fkey";
ALTER TABLE "TimeEntry" RENAME CONSTRAINT "TimeEntry_barId_fkey" TO "TimeEntry_establishmentId_fkey";

-- NOT NULL constraints. Postgres 17 and up give these catalogue names of their own; older versions
-- do not have them at all. Local development and production run 18, the e2e testcontainer runs 16,
-- and naming them outright fails on the latter. Renaming whatever the catalogue actually holds
-- keeps one file correct on both: on 16 the loop simply finds nothing.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT t.relname AS table_name, c.conname AS constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = current_schema()
      AND c.contype = 'n'
      AND (c.conname LIKE 'Bar%' OR c.conname LIKE '%\_barId\_%')
  LOOP
    EXECUTE format(
      'ALTER TABLE %I RENAME CONSTRAINT %I TO %I',
      r.table_name,
      r.constraint_name,
      regexp_replace(regexp_replace(r.constraint_name, '^Bar', 'Establishment'), '_barId_', '_establishmentId_')
    );
  END LOOP;
END $$;

-- Indexes (renaming a primary key or unique index renames its constraint with it)
ALTER INDEX "Bar_pkey" RENAME TO "Establishment_pkey";
ALTER INDEX "BarMember_barId_deletedAt_idx" RENAME TO "EstablishmentMember_establishmentId_deletedAt_idx";
ALTER INDEX "BarMember_pkey" RENAME TO "EstablishmentMember_pkey";
ALTER INDEX "BarMember_userId_barId_key" RENAME TO "EstablishmentMember_userId_establishmentId_key";
ALTER INDEX "BarSubscription_barId_key" RENAME TO "EstablishmentSubscription_establishmentId_key";
ALTER INDEX "BarSubscription_manualPlan_idx" RENAME TO "EstablishmentSubscription_manualPlan_idx";
ALTER INDEX "BarSubscription_pkey" RENAME TO "EstablishmentSubscription_pkey";
ALTER INDEX "BarSubscription_status_idx" RENAME TO "EstablishmentSubscription_status_idx";
ALTER INDEX "BarSubscription_stripeCustomerId_key" RENAME TO "EstablishmentSubscription_stripeCustomerId_key";
ALTER INDEX "BarSubscription_stripeSubscriptionId_key" RENAME TO "EstablishmentSubscription_stripeSubscriptionId_key";
ALTER INDEX "Category_barId_deletedAt_idx" RENAME TO "Category_establishmentId_deletedAt_idx";
ALTER INDEX "Order_barId_createdAt_idx" RENAME TO "Order_establishmentId_createdAt_idx";
ALTER INDEX "Order_barId_status_idx" RENAME TO "Order_establishmentId_status_idx";
ALTER INDEX "PrintJob_barId_status_createdAt_idx" RENAME TO "PrintJob_establishmentId_status_createdAt_idx";
ALTER INDEX "PrinterConfig_barId_key" RENAME TO "PrinterConfig_establishmentId_key";
ALTER INDEX "Shift_barId_startTime_idx" RENAME TO "Shift_establishmentId_startTime_idx";
ALTER INDEX "TimeEntry_barId_sequence_key" RENAME TO "TimeEntry_establishmentId_sequence_key";
ALTER INDEX "TimeEntry_barId_userId_workdayDate_idx" RENAME TO "TimeEntry_establishmentId_userId_workdayDate_idx";
ALTER INDEX "TimeEntry_barId_workdayDate_idx" RENAME TO "TimeEntry_establishmentId_workdayDate_idx";

-- Tables
ALTER TABLE "Bar" RENAME TO "Establishment";
ALTER TABLE "BarMember" RENAME TO "EstablishmentMember";
ALTER TABLE "BarSubscription" RENAME TO "EstablishmentSubscription";

-- AdminAuditLog stores these enums as plain text, so rows already on disk have to move with the
-- code or they stop matching both their translation key and the target-type filter. Unlike
-- TimeEntry, this log carries no trigger and no legal weight: rewriting it keeps history readable.
UPDATE "AdminAuditLog" SET "action" = 'ESTABLISHMENT_PLAN_GRANTED' WHERE "action" = 'BAR_PLAN_GRANTED';
UPDATE "AdminAuditLog" SET "action" = 'ESTABLISHMENT_PLAN_REVOKED' WHERE "action" = 'BAR_PLAN_REVOKED';
UPDATE "AdminAuditLog" SET "action" = 'ESTABLISHMENT_RENAMED' WHERE "action" = 'BAR_RENAMED';
UPDATE "AdminAuditLog" SET "action" = 'ESTABLISHMENT_MEMBER_ROLE_CHANGED' WHERE "action" = 'BAR_MEMBER_ROLE_CHANGED';
UPDATE "AdminAuditLog" SET "targetType" = 'ESTABLISHMENT' WHERE "targetType" = 'BAR';
