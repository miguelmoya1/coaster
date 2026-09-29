-- +goose Up
-- +goose StatementBegin
-- AlterEnum
ALTER TYPE "BarRole" ADD VALUE 'MANAGER';
-- +goose StatementEnd
