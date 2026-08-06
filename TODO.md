# 📋 Plan de Ruta y Arquitectura de Coaster

Este documento detalla la estrategia de desarrollo secuencial para las funcionalidades restantes de **Coaster**. Está estructurado para respetar y potenciar la arquitectura limpia (DDD/CQRS) implementada en el core de NestJS y Angular.

---

## Fase 1: Operativa Interna y Cumplimiento Legal

**Módulo:** Fichaje y Control Horario (Clock-in / Clock-out)

- **Impacto en Arquitectura:** Extensión del modelo de trabajadores o creación de un dominio separado para la gestión de jornadas (`DbShift` / `DbTimeLog`).
- **Flujo de Trabajo:**
  1. Registro de marcas de tiempo en tiempo real con opción de geolocalización asíncrona.
  2. Lógica de dominio para contrastar la planificación teórica versus las marcas reales del empleado.

## Fase 2: Asistente de voz (descartado LiveKit)

Se evaluó LiveKit y se descartó: obliga a un agente alojado fuera, un túnel público hacia la API
en desarrollo y configuración en un panel externo. Demasiada superficie para el valor que aporta
en un caso de órdenes sueltas detrás de la barra.

El asistente actual se queda con dictado del navegador (Web Speech API) más el endpoint
`/bars/:barId/ai`, que ya ejecuta las tools con sus permisos. Mejoras aplicadas: respuesta en
streaming por SSE, campo de texto para escribir cuando hay ruido o el navegador no soporta
dictado, consultas de contexto en paralelo e historial acotado.

Segunda iteración: las tools se ejecutan dentro del bucle del modelo (`stopWhen`), así que puede
consultar antes de actuar y encadenar varias llamadas en un turno. Cubre pedidos (mover, unir,
descuentos, propina), productos, categorías, mesas, turnos, cambios de turno, personal y
estadísticas. Cada tool pasa por `createToolRunner`, que comprueba el permiso del rol antes de
tocar el bus y exige confirmación explícita del usuario en las acciones destructivas. En el front
el asistente vive en la barra superior (junto al menú de tres puntos) y abre un panel lateral a la
derecha en escritorio / hoja inferior en móvil.

## Fase 3: Capa de Inteligencia y Valor Añadido

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

## SISTEMA DE RESERVA DE MESAS (PLANTEAR).

## visualizar la carta de forma publica.

## Mostrar las ventajas de la subscripcion y poner los limites en backend y algo mas visual en el front.
