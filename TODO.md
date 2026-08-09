# 📋 Plan de Ruta de Coaster

Estrategia de desarrollo secuencial para lo que queda. Respeta la arquitectura DDD/CQRS del core de
NestJS y la separacion por capas de Angular.

El detalle tecnico vive en [`docs/`](docs/README.md); aqui solo esta el orden de trabajo.

## Fase 1: Operativa Interna y Cumplimiento Legal — HECHA

Modulo `time-tracking` cerrado: marcas append-only con cadena de hash por bar y sellado diario,
correcciones firmadas sin sobrescribir el original, rango libre de fechas para el registro y el
export CSV, y contraste de la planificacion contra lo realmente trabajado. El detalle esta en
[Fichaje y control horario](docs/operations/time-tracking.md).

Queda fuera a proposito el export en PDF: el RD-ley 8/2019 obliga a llevar el registro y tenerlo a
disposicion, pero no impone formato, y el CSV ya cumple.

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
- **CORS abierto** (`origin: '*'`) en la API y en el gateway de websockets, a la espera de fijar el
  dominio definitivo. Cambiar a una lista blanca antes de tener clientes.
