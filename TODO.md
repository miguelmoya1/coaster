# 📋 Plan de Ruta y Arquitectura de Coaster

Este documento detalla la estrategia de desarrollo secuencial para las funcionalidades restantes de **Coaster**. Está estructurado para respetar y potenciar la arquitectura limpia (DDD/CQRS) implementada en el core de NestJS y Angular.

---

## 🏗️ Fases de Implementación Orientadas a Negocio

### Fase 1: El Core Transaccional (TPV Puro)

**Módulo:** Pedidos, Descuentos y Propinas

- **Impacto en Arquitectura:** Modificación directa sobre los agregados principales (`DbOrder` y `DbOrderItem`). Al ser lógica transaccional pura, debe asentarse antes de recibir tráfico de datos reales.
- **Flujo de Trabajo:**
  1. Extensión del esquema de la base de datos para almacenar `tipAmount` y `discountAmount`.
  2. Implementación de los casos de uso correspondientes en el backend para recalcular los totales de forma inmutable.
  3. Actualización de la interfaz del TPV en Angular para aplicar estos conceptos en caliente.

### Fase 2: Conectividad y Entorno Físico

**Módulo:** Printer (Impresora de tickets)

- **Impacto en Arquitectura:** Aislamiento de la infraestructura local mediante el bridge en Go.
- **Estrategia de Seguridad y Red:**
  1. Descubrimiento dinámico de la IP local o detección desde la interfaz web.
  2. Implementación de CORS estricto o un sistema de rutas securizadas mediante tokens de autenticación dinámicos rotativos.

### Fase 3: Infraestructura SaaS y Comercialización

**Módulos:** Landing Page & Monetización con Stripe

- **Impacto en Arquitectura:** Introducción formal del concepto de multi-inquilino (_Multi-tenancy_) y control de límites por suscripción (_Free Tier_ vs _Premium_).
- **Flujo de Trabajo:**
  1. Migración del enrutamiento de la aplicación hacia `coaster.business/app`, liberando la raíz para la landing comercial.
  2. Integración de Webhooks de Stripe desacoplados. El webhook capturará el evento externo y disparará un evento de dominio interno (`SubscriptionRenewedEvent` o `SubscriptionCancelledEvent`) para actualizar de forma asíncrona el estado del local.

### Fase 4: Operativa Interna y Cumplimiento Legal

**Módulo:** Fichaje y Control Horario (Clock-in / Clock-out)

- **Impacto en Arquitectura:** Extensión del modelo de trabajadores o creación de un dominio separado para la gestión de jornadas (`DbShift` / `DbTimeLog`).
- **Flujo de Trabajo:**
  1. Registro de marcas de tiempo en tiempo real con opción de geolocalización asíncrona.
  2. Lógica de dominio para contrastar la planificación teórica versus las marcas reales del empleado.

### Fase 5: Capa de Inteligencia y Valor Añadido

**Módulo:** IA de Recomendaciones (Ventas, Inventario, RRHH)

- **Impacto en Arquitectura:** Consumo de datos históricos acumulados mediante un servicio asíncronizado (`CronJob` en NestJS) que interactúa con la persistencia a través de `DbAiRecommendation`.
- **Flujo de Trabajo:**
  1. **Ventas:** Análisis de los productos con mayor y menor rendimiento comercial.
  2. **Inventario:** Sugerencia inteligente de ajustes de precios basados en stock estancado y rotación nula.
  3. **RRHH:** Optimización de turnos basada en la carga y flujo histórico de trabajo del bar.

---

## 📂 Propuesta de Estructura de Documentación (`/docs`)

Para integrarse perfectamente con GitHub (wikis, documentación interna o GitHub Pages), se recomienda la creación de una carpeta `/docs` en la raíz del repositorio con la siguiente estructura limpia:

```text
coaster/
├── .github/
├── docs/
│   ├── README.md               # Índice general y guía de la documentación
│   ├── roadmap.md              # Este archivo (Plan de Ruta)
│   ├── architecture/
│   │   ├── domain-models.md    # Definición de agregados, entidades y eventos
│   │   └── printing-bridge.md  # Especificación del puente en Go y seguridad CORS
│   └── saas/
│       └── stripe-integration.md # Flujo de webhooks y manejo de tiers
├── backend/                    # NestJS
├── frontend/                   # Angular
└── printing-bridge/            # Go Application
```

**Nota:** Mantener la documentación dentro del propio repositorio (en `/docs`) asegura que evolucione en el mismo ciclo de vida que el código fuente mediante Pull Requests.
