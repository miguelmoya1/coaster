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
