# 🗺️ Coaster App - Roadmap Actualizado

## 🚨 Hotfixes & Configuración (Prioridad Alta)
- [ ] **Configuración de URLs Dinámicas:**
  - [ ] Corregir el template de Resend para que use la variable dinámica en el botón de "Entrar a Coaster".

## 📦 Dominio: Almacén (Pantry) - Finalización
- [ ] **Operaciones de Limpieza (CRUD Completo):**
  - [ ] **Borrar Producto:** Implementar endpoint `DELETE` y diálogo de confirmación en el Front.
  - [ ] **Borrar Categoría:** Implementar endpoint `DELETE`. Lógica de seguridad: ¿Qué pasa con los productos huérfanos? (Sugerencia: mover a categoría "Sin categoría" o borrar en cascada).
- [ ] **Edición de Categorías:**
  - [ ] Modal de gestión de categorías (Editar nombres existentes).

## 👥 Dominio: Equipo (Staff) - Finalización
- [ ] **Bajas y Permisos:**
  - [ ] **Eliminar Miembro:** Botón para quitar a alguien del bar (Borrar relación en la DB).
  - [ ] **Editar Rol:** Poder cambiar de Staff a Owner y viceversa.
  - [ ] **Cancelar Invitación:** Botón para cancelar una invitación pendiente.

## 🗓️ Dominio: Turnos (Roster) - Fase de Diseño y Construcción
Este módulo ahora incluye las vistas de productividad que solicitaste.

- [ ] **Lógica de Duplicación (Smart Action):**
  - [ ] Botón "Duplicar semana anterior": Endpoint que tome los turnos de la semana `n-1` y los clone en la semana `n` manteniendo los mismos empleados y horas.
- [ ] **Visualización Multiformato:**
  - [ ] **Weekly Calendar:** Vista de "batalla" diaria para el Staff.
  - [ ] **Monthly Calendar:** Vista estratégica para el Owner (ver el mes completo de un vistazo).
- [ ] **Gestión de Turnos:**
  - [ ] Crear / Editar / Borrar turnos individuales.
  - [ ] Sistema de "Publicación": Los turnos creados están en gris (borrador) hasta que el Owner pulsa "Publicar semana".

- [ ] **Intercambio de Turnos (Shift Swaps - Flujo de Aprobación):**
    - [ ] **Solicitud (STAFF):**
        - [ ] Opción en el turno del empleado para "Ofrecer turno" (marcarlo como disponible para otros).
        - [ ] Vista de "Turnos Disponibles" (Marketplace) donde otro camarero puede darle a "Solicitar este turno".
    - [ ] **Resolución (OWNER):**
        - [ ] Sección de alertas/notificaciones para el dueño con los cambios pendientes.
        - [ ] Sistema de "Aprobar / Rechazar" el cambio (que actualice automáticamente el `userId` del turno en la base de datos si se aprueba).

## 🧪 Testing: Adoptar nuevos Test Harnesses de `@angular/aria`
> **Requiere:** Actualizar `@angular/aria` a `>=22.0.0` (actualmente en `next`, esperar a stable).

Los nuevos harnesses ofrecen una API semántica para testear componentes aria (`isSelected()`, `isDisabled()`, `getOptions()`, etc.) en lugar de acceder al DOM con `querySelector`.

- [ ] **Actualizar `@angular/aria`** cuando salga la versión stable con harnesses.
- [ ] **`ListboxHarness`** (`@angular/aria/listbox-testing`):
  - [ ] `select-input.spec.ts` — Sustituir `querySelector('button')` por harness.
  - [ ] `multi-select-input.spec.ts` — Sustituir `querySelector('button')` por harness.
  - [ ] `horizontal-date-scroller.spec.ts` — Enriquecer tests (orientación, selección de día).
- [ ] **`TabsHarness`** (`@angular/aria/tabs-testing`):
  - [ ] `category-tabs.spec.ts` — Testear selección de tabs, `getTitle()`, `isDisabled()`.
- [ ] **`ToolbarHarness`** (`@angular/aria/toolbar-testing`):
  - [ ] `bottom-nav.spec.ts` — Testear widgets de navegación, orientación.
  - [ ] `top-app-bar.spec.ts` — Testear widget de búsqueda, `isDisabled()`.