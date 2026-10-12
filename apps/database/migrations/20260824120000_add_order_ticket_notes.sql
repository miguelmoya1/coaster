-- +goose Up
-- +goose StatementBegin
ALTER TABLE "Order" ADD COLUMN "ticketNotes" TEXT;
-- +goose StatementEnd
