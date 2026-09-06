-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "taxRate" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "taxCategory",
ALTER COLUMN "taxRate" DROP NOT NULL,
ALTER COLUMN "taxRate" DROP DEFAULT;


UPDATE "Product" AS p
SET "taxRate" = NULL
FROM "Category" AS c
WHERE c."id" = p."categoryId" AND p."taxRate" = c."taxRate";
