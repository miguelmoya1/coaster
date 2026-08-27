-- El turno espejado en Fichit. Solo se rellena en los establecimientos que ya
-- fichan allí: es lo que permite que el informe de Fichit contraste lo planificado
-- con lo trabajado sin que Coaster tenga que consultar dos servicios para pintar
-- una sola fila.

ALTER TABLE "Shift" ADD COLUMN "fichitShiftId" TEXT;
CREATE UNIQUE INDEX "Shift_fichitShiftId_key" ON "Shift" ("fichitShiftId");
