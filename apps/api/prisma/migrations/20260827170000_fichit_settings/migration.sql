-- La configuración de la integración con Fichit, editable desde el panel sin
-- redesplegar. Una sola fila: es configuración de la aplicación, no de un
-- establecimiento.
--
-- La clave se guarda cifrada. Un cliente tiene que poder presentarla, así que
-- no se puede hashear como hace Fichit con las suyas; y en claro sería peor que
-- la variable de entorno de hoy, porque cualquiera que lea un volcado de la
-- base se llevaría la credencial que administra todas las empresas.

CREATE TABLE "FichitSettings" (
    "id" TEXT NOT NULL DEFAULT 'fichit',
    "apiUrl" TEXT,
    "apiKeyCipher" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FichitSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FichitSettings_single_row" CHECK ("id" = 'fichit')
);

ALTER TABLE "FichitSettings"
  ADD CONSTRAINT "FichitSettings_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
