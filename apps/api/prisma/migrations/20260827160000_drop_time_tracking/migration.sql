-- El registro horario se lleva entero en Fichit. Aquí no queda rastro: ni la
-- tabla, ni la cadena de hashes, ni los triggers que la hacían inmutable.
--
-- Mantener las dos implementaciones era la duplicación que la migración venía a
-- quitar, y media implementación apagada es peor que ninguna: parece que
-- guarda algo y no lo guarda.

DROP TRIGGER IF EXISTS "time_entry_no_update" ON "TimeEntry";
DROP TRIGGER IF EXISTS "time_entry_no_delete" ON "TimeEntry";
DROP TABLE IF EXISTS "TimeEntry";
DROP FUNCTION IF EXISTS "time_entry_append_only"();

-- No hay interruptor que valga: sin registro local, todos los establecimientos
-- fichan en Fichit desde el primer día.
ALTER TABLE "Establishment" DROP COLUMN IF EXISTS "fichitClockingSince";
