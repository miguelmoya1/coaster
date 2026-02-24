---
trigger: always_on
---

# 🍺 Coaster (BarTeam) - Especificaciones del Proyecto

## 1. Visión

Herramienta operativa interna para pequeños negocios de servicios (Hostelería, Talleres, Clínicas).
**Objetivo:** Eliminar el caos de WhatsApp y papel en la gestión de RRHH y Stock.
**Filosofía:** "No Billing". No tocamos facturación ni clientes finales. Solo gestión interna.

## 2. Arquitectura Técnica (The Golden Stack)

- **Monorepo:** Nx (Integrated).
- **Backend:** NestJS + Prisma ORM + PostgreSQL.
- **Frontend:** Angular 19 + Tailwind CSS v4 + Signals.
- **Testing:** Jest (Unitarios) + Supertest/Playwright (E2E).
- **Infra:** Docker (Local) / Cloud Run + Neon (Prod).

## 3. Módulos Funcionales (MVP)

### A. Módulo RRHH (El Cuadrante)

Gestiona quién trabaja y cuándo.

- **Entidades:** `User` (Staff/Admin), `Shift` (Turno), `ShiftExchange` (Solicitud de cambio).
- **Funcionalidades:**
  - **Calendario Multi-vista:** El usuario puede alternar entre vista **Diaria, Semanal y Mensual**.
  - **Asignación:** El Admin crea turnos arrastrando o clicando.
  - **Marketplace de Turnos:** Staff puede "soltar" un turno y otro "cogerlo" (con o sin aprobación del Admin).
  - **Fichaje (Futuro):** Registro de entrada/salida geolocalizado.

### B. Módulo Logística (La Despensa)

Gestiona qué falta y genera pedidos.

- **Entidades:** `Product` (Item), `Category`, `StockAlert`.
- **Funcionalidades:**
  - **Catálogo Visual:** Iconos grandes para facilitar uso rápido en pantallas táctiles.
  - **Semáforo:** Estado "OK", "Bajo Mínimos", "Agotado".
  - **Pedido Inteligente:** Generación automática de texto para WhatsApp del proveedor agrupando items faltantes.

## 4. Estrategia de Desarrollo

1. **Librerías Compartidas:** Definir Interfaces (DTOs) y Utilidades de Seguridad primero.
2. **Backend First:** Desarrollo de API REST/GraphQL completa con TDD.
3. **Frontend Last:** Implementación de UI contra API ya probada.
