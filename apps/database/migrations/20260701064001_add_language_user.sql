-- +goose Up
-- +goose StatementBegin
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'es';
-- +goose StatementEnd
