# 📋 Coaster TODO List

## 🤖 Inteligencia Artificial (Recomendaciones)

- [ ] **Esquema BD:** Crear modelo `DbAiRecommendation` (campos: type, content, barId, status).
- [ ] **Backend (Ventas):** Crear CronJob en NestJS que analice productos más/menos vendidos.
- [ ] **Backend (Inventario):** IA para sugerir bajar precios de productos con stock alto y sin ventas recientes.
- [ ] **Backend (RRHH):** IA para recomendaciones de horarios de empleados y tiempos basados en el flujo de trabajo.

## 🕒 Fichaje y Control Horario (Clock-in / Clock-out)

- [ ] **Esquema BD:** Añadir `clockInTime` y `clockOutTime` a `DbShift` (o crear modelo `DbTimeLog` para registrar pausas).
- [ ] **Frontend:** Interfaz de fichaje en tiempo real (con opción de geolocalización, según README).
- [ ] **Backend:** Lógica para comparar hora real vs hora programada.

## 🗑️ Eliminación Lógica (Soft Deletes)

- [x] **Esquema BD:** Añadir campo `isArchived` (Boolean) o `deletedAt` (DateTime) a `DbProduct`, `DbCategory`, y `DbBarMember`.
- [x] **Backend:** Modificar los endpoints para excluir registros archivados por defecto y permitir recuperarlos.
- [x] **Frontend:** Ocultar elementos archivados del TPV y listados principales, pero conservarlos para estadísticas e historial.

## 👥 Roles y Permisos Granulares

- [x] **Esquema BD:** Añadir el rol `MANAGER` al enum `DbBarRole` (ahora mismo solo hay OWNER y STAFF).
- [x] **Backend:** Ajustar los Guards de NestJS (ej: un MANAGER puede aprobar intercambios de turno, pero no borrar el bar).
- [x] **Frontend:** Adaptar la visibilidad de los menús de configuración según el rol.

## 💰 Pedidos, Descuentos y Propinas

- [ ] **Esquema BD:** Añadir campos `tipAmount`, `discountAmount` (o porcentaje) a `DbOrder` y `DbOrderItem`.
- [ ] **Frontend:** Añadir opciones en el TPV para registrar propinas y aplicar descuentos (invitaciones de la casa, promociones).
- [ ] **Backend:** Actualizar la lógica de cálculo de los totales de la orden.

## 🌍 Internacionalización (i18n)

- [x] **Frontend:** Configurar `@ngx-translate/core` o el i18n nativo de Angular.
- [x] **Frontend:** Traducir textos estáticos de la aplicación.
- [x] **Esquema BD:** Pensar estrategia para las traducciones dinámicas (ej: nombres en `DbProductTemplate`).

## Landing Page
