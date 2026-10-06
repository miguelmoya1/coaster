-- +goose Up
-- +goose StatementBegin
-- AlterTable
ALTER TABLE "BarMember" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deletedAt" TIMESTAMP(3);
-- +goose StatementEnd
