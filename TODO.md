# 📋 Plan de Ruta y Arquitectura de Coaster

Este documento detalla la estrategia de desarrollo secuencial para las funcionalidades restantes de **Coaster**. Está estructurado para respetar y potenciar la arquitectura limpia (DDD/CQRS) implementada en el core de NestJS y Angular.

---

## Fase 1: Operativa Interna y Cumplimiento Legal

**Módulo:** Fichaje y Control Horario (Clock-in / Clock-out)

- **Impacto en Arquitectura:** Extensión del modelo de trabajadores o creación de un dominio separado para la gestión de jornadas (`DbShift` / `DbTimeLog`).
- **Flujo de Trabajo:**
  1. Registro de marcas de tiempo en tiempo real con opción de geolocalización asíncrona.
  2. Lógica de dominio para contrastar la planificación teórica versus las marcas reales del empleado.

## Fase 2: Capa de Inteligencia y Valor Añadido

**Módulo:** IA de Recomendaciones (Ventas, Inventario, RRHH)

- **Impacto en Arquitectura:** Consumo de datos históricos acumulados mediante un servicio asíncronizado (`CronJob` en NestJS) que interactúa con la persistencia a través de `DbAiRecommendation`.
- **Flujo de Trabajo:**
  1. **Ventas:** Análisis de los productos con mayor y menor rendimiento comercial.
  2. **Inventario:** Sugerencia inteligente de ajustes de precios basados en stock estancado y rotación nula.
  3. **RRHH:** Optimización de turnos basada en la carga y flujo histórico de trabajo del bar.

---

## SISTEMA DE RESERVA DE MESAS (PLANTEAR).

## visualizar la carta de forma publica.

Lo que tienes que poner en Cloud Run
Además de PUBLIC_URL=https://api.coaster.business, las de Stripe que dices que aún no has puesto: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET y STRIPE_PRICE_PRO. Y comprueba que PRINTER_JWT_SECRET ya está, porque sin ella la API no arranca — si el servicio está vivo ahora mismo, es que la tienes.

Dos avisos sobre esas variables:

El STRIPE_WEBHOOK_SECRET de producción no es el que te da stripe listen en local. Sale del endpoint que registres en el dashboard de Stripe apuntando a https://api.coaster.business/api/v1/stripe/webhook.
Añade también FRONTEND_URL=https://coaster.business, o al volver de pagar Stripe redirigirá a localhost:4200.
