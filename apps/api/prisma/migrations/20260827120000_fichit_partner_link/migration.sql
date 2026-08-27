-- Enlace con Fichit: cada establecimiento es una empresa allí, y cada miembro un
-- empleado de esa empresa. Ambas columnas nacen vacías y se rellenan cuando la
-- sincronización sale bien; si Fichit no responde, se quedan a NULL y el
-- reconciliador las repara. Coaster nunca deja de funcionar por eso.

ALTER TABLE "Establishment" ADD COLUMN "fichitCompanyId" TEXT;
ALTER TABLE "EstablishmentMember" ADD COLUMN "fichitEmployeeId" TEXT;

CREATE UNIQUE INDEX "Establishment_fichitCompanyId_key"
  ON "Establishment" ("fichitCompanyId");
CREATE UNIQUE INDEX "EstablishmentMember_fichitEmployeeId_key"
  ON "EstablishmentMember" ("fichitEmployeeId");
