-- +goose Up
ALTER TABLE "CashClose" ADD COLUMN "voidedAt" TIMESTAMP(3), ADD COLUMN "voidedById" TEXT;

ALTER TABLE "CashClose" ADD CONSTRAINT "CashClose_voidedById_fkey"
    FOREIGN KEY ("voidedById") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
