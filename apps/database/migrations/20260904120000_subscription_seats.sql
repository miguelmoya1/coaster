-- +goose Up
-- +goose StatementBegin
-- AlterTable
ALTER TABLE "EstablishmentSubscription" ADD COLUMN     "seats" INTEGER NOT NULL DEFAULT 1;
-- +goose StatementEnd
