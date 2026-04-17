# 🗺️ Coaster App - Roadmap Actualizado

## 🚨 Arquitectura & Hotfixes (Prioridad Alta)
- [ ] **Configuración de URLs Dinámicas:**
  - [ ] Corregir el template de Resend para que use la variable dinámica en el botón de "Entrar a Coaster".
- [ ] **Deep Linking para Modales (Navegación sin estado):**
  - [ ] Implementar ruta `/pantry/new` usando el signal `isActive` de Angular Router para abrir el modal de creación de productos.
  - [ ] Implementar ruta `/staff/new` (o `/staff/invite`) para el modal de invitar empleados.

## 📦 Dominio: Almacén (Pantry) - Finalización
- [ ] **Actualización del Modelo de Datos:**
  - [ ] Añadir campo `price` (precio) a la interfaz `Product` y a los DTOs/Base de datos.
- [ ] **Operaciones de Limpieza (CRUD Completo):**
  - [ ] **Borrar Producto:** Implementar endpoint `DELETE` y diálogo de confirmación en el Front.
  - [ ] **Borrar Categoría:** Implementar endpoint `DELETE`. (Lógica: mover productos a "Sin categoría" o borrar en cascada).

## 📝 Dominio: Pedidos / POS (¡NUEVO MÓDULO!)
El sistema de toma de comandas y facturación.
- [ ] **Fase 1: Interfaz de Comandas:**
  - [ ] Pantalla para seleccionar productos, añadir cantidades y ver el "Total" (Precio x Cantidad).
  - [ ] Selector de "Mesa" o "Nombre del cliente".
- [ ] **Fase 2: Motor de Stock y Base de Datos:**
  - [ ] Crear la entidad `Order` (Historial de pedidos cerrados).
  - [ ] **Automatización:** Al completar un pedido, descontar automáticamente las cantidades del stock principal.
  - [ ] Mantener la actualización de stock manual en "Pantry" activa para roturas o consumiciones del personal.

## 👥 Dominio: Equipo (Staff) - Finalización
- [ ] **Bajas y Permisos:**
  - [ ] **Eliminar Miembro:** Botón para quitar a alguien del bar (Borrar relación en la DB).
  - [ ] **Editar Rol:** Poder cambiar de Staff a Owner y viceversa.
  - [ ] **Cancelar Invitación:** Botón para cancelar una invitación pendiente.

## 🗓️ Dominio: Turnos (Roster) - Fase de Diseño y Construcción
- [ ] **Lógica de Duplicación (Smart Action):**
  - [ ] Botón "Duplicar semana anterior": Endpoint que tome los turnos de la semana `n-1` y los clone en la semana `n`.
- [ ] **Gestión de Turnos:**
  - [ ] Editar / Borrar turnos individuales.
  - [ ] Sistema de "Publicación": Los turnos creados están en gris (borrador) hasta que el Owner pulsa "Publicar semana".
- [ ] **Intercambio de Turnos - Flujo Owner (Fase 2):**
    - [ ] **Resolución (OWNER):**
        - [ ] Sección de alertas/notificaciones con los cambios pendientes.
        - [ ] Sistema de "Aprobar / Rechazar" el cambio.

## 🧪 Testing: Adoptar nuevos Test Harnesses de `@angular/aria`
> **Requiere:** Actualizar `@angular/aria` a `>=22.0.0` (actualmente en `next`, esperar a stable).
- [ ] **Actualizar `@angular/aria`** cuando salga la versión stable con harnesses.
- [ ] **`ListboxHarness`** (`@angular/aria/listbox-testing`):
  - [ ] `select-input.spec.ts` & `multi-select-input.spec.ts` — Sustituir `querySelector('button')` por harness.
  - [ ] `horizontal-date-scroller.spec.ts` — Enriquecer tests.
- [ ] **`TabsHarness`** (`@angular/aria/tabs-testing`):
  - [ ] `category-tabs.spec.ts` — Testear selección de tabs, `getTitle()`, `isDisabled()`.
- [ ] **`ToolbarHarness`** (`@angular/aria/toolbar-testing`):
  - [ ] `bottom-nav.spec.ts` & `top-app-bar.spec.ts` — Testear widgets de navegación.