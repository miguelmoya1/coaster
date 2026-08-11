CREATE TABLE "Menu" (
  "id" TEXT NOT NULL,
  "establishmentId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "defaultLanguage" TEXT NOT NULL,
  "languages" TEXT[],
  "publishedSnapshot" JSONB,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuSection" (
  "id" TEXT NOT NULL,
  "menuId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "translations" JSONB NOT NULL,

  CONSTRAINT "MenuSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MenuItem" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "productId" TEXT,
  "price" INTEGER,
  "position" INTEGER NOT NULL,
  "translations" JSONB NOT NULL,

  CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- The slug is what a printed QR points at, so it cannot be taken twice.
CREATE UNIQUE INDEX "Menu_slug_key" ON "Menu"("slug");
CREATE INDEX "Menu_establishmentId_idx" ON "Menu"("establishmentId");
CREATE INDEX "MenuSection_menuId_idx" ON "MenuSection"("menuId");
CREATE INDEX "MenuItem_sectionId_idx" ON "MenuItem"("sectionId");
CREATE INDEX "MenuItem_productId_idx" ON "MenuItem"("productId");

ALTER TABLE "Menu" ADD CONSTRAINT "Menu_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuSection" ADD CONSTRAINT "MenuSection_menuId_fkey"
  FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "MenuSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deleting a product empties the reference rather than the menu line: the line keeps its own
-- wording and price, and the editor can show that it no longer points anywhere.
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
