-- El interruptor del fichaje. NULL significa que ese establecimiento sigue
-- fichando aquí; con fecha, fichó en Fichit desde ese instante.
--
-- Es una fecha y no un booleano porque el histórico no se mueve: la cadena de
-- hashes de Coaster no se puede reescribir ni importar a la de Fichit sin
-- romper lo que le da valor probatorio. Cada lado guarda su tramo, y esta
-- columna es la frontera entre los dos.

ALTER TABLE "Establishment" ADD COLUMN "fichitClockingSince" TIMESTAMP(3);
