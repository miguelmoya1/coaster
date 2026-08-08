# 📋 Plan de Ruta de Coaster

Estrategia de desarrollo secuencial para lo que queda. Respeta la arquitectura DDD/CQRS del core de
NestJS y la separacion por capas de Angular.

El detalle tecnico vive en [`docs/`](docs/README.md); aqui solo esta el orden de trabajo.

## Fase 1: Operativa Interna y Cumplimiento Legal

**Modulo:** Fichaje y Control Horario (Clock-in / Clock-out)

Hecho: modulo `time-tracking` con `DbTimeEntry` append-only, cadena de hash por bar, correcciones
firmadas con motivo, y la interfaz dentro de la pagina de Turnos. El detalle esta en
[Fichaje y control horario](docs/operations/time-tracking.md).

- [x] Marcas de entrada, pausas y salida con hora de servidor y geolocalizacion opcional.
- [x] Correccion y anulacion sin sobrescribir el original, con quien / cuando / que / por que.
- [x] Cada uno corrige sus propias marcas con motivo; anular y tocar las de otro es de manager u owner.
- [x] Historial visible para el trabajador y verificacion de integridad de la cadena.
- [x] Export CSV para Inspeccion y auditoria en el backoffice cuando actua un admin.
- [x] Interfaz Angular dentro de Turnos: fichaje del trabajador, registro del equipo, correcciones
      con motivo y descarga del CSV.
- [ ] Rango libre de fechas para el registro y el export (hoy va por el dia seleccionado).
- [ ] Export en PDF.
- [ ] Sellado diario del hash cabeza de cadena.
- [ ] Contraste de la planificacion (`DbShift`) contra las marcas reales mas alla de
      `Workday.plannedMinutes`.

## Fase 2: Capa de Inteligencia y Valor Anadido

**Modulo:** IA de Recomendaciones (Ventas, Inventario, RRHH)

- **Impacto en arquitectura:** consumo de historico mediante un servicio asincrono (`CronJob`) que
  persiste en `DbAiRecommendation`.
- **Flujo de trabajo:**
  1. **Ventas:** analisis de los productos con mayor y menor rendimiento.
  2. **Inventario:** sugerencia de ajustes de precio segun stock estancado y rotacion nula.
  3. **RRHH:** optimizacion de turnos segun la carga historica del bar.

---

## Por plantear

- Sistema de reserva de mesas.
- Visualizacion publica de la carta.

## Deuda conocida

- **Acciones destructivas en el backoffice**: borrar bares y usuarios se dejo fuera a proposito.
  Si se anaden, deben pedir confirmacion escribiendo el nombre y quedar en auditoria.
- **`AdminGuard` falla abierto** sin el decorador `@Admin()`. Hay un test que lo cubre
  (`admin-controllers.security.spec.ts`), pero conviene invertirlo cuando se pueda.
