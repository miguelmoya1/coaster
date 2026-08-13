-- The language an establishment writes its catalogue in. Existing rows are Spanish, which is what
-- every establishment created so far is.
ALTER TABLE "EstablishmentSettings" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'es';

-- Annex II of Regulation 1169/2011: the fourteen an establishment is obliged to declare.
CREATE TYPE "Allergen" AS ENUM (
  'GLUTEN',
  'CRUSTACEANS',
  'EGGS',
  'FISH',
  'PEANUTS',
  'SOYBEANS',
  'MILK',
  'NUTS',
  'CELERY',
  'MUSTARD',
  'SESAME',
  'SULPHITES',
  'LUPIN',
  'MOLLUSCS'
);

-- Left empty on purpose: nobody can know what is in someone else's croquetas.
ALTER TABLE "Product" ADD COLUMN "allergens" "Allergen"[] DEFAULT ARRAY[]::"Allergen"[];
