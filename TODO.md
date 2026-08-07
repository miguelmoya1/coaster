# 📋 Plan de Ruta de Coaster

Estrategia de desarrollo secuencial para lo que queda. Respeta la arquitectura DDD/CQRS del core de
NestJS y la separacion por capas de Angular.

El detalle tecnico vive en [`docs/`](docs/README.md); aqui solo esta el orden de trabajo.

---

## ✅ Completado

- **Infraestructura SaaS**: Stripe Checkout, Customer Portal y webhooks idempotentes.
- **Backoffice de administracion**: panel `/admin` con metricas de plataforma, gestion de bares y
  usuarios, concesion manual de PRO sin Stripe y registro de auditoria.
- **Modelo de permisos unificado**: una sola tabla en `@coaster/common` para API y front.

---

## Fase 1: Operativa Interna y Cumplimiento Legal

**Modulo:** Fichaje y Control Horario (Clock-in / Clock-out)

- **Impacto en arquitectura:** extension del modelo de trabajadores o dominio separado para la
  gestion de jornadas (`DbShift` / `DbTimeLog`).
- **Flujo de trabajo:**
  1. Registro de marcas de tiempo en tiempo real con geolocalizacion asincrona.
  2. Logica de dominio para contrastar la planificacion teorica contra las marcas reales.

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
