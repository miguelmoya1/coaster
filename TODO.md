# 📋 Coaster TODO List

## 🤖 Inteligencia Artificial (Recomendaciones)

- [ ] **Esquema BD:** Crear modelo `DbAiRecommendation` (campos: type, content, barId, status).
- [ ] **Backend (Ventas):** Crear CronJob en NestJS que analice productos más/menos vendidos.
- [ ] **Backend (Inventario):** IA para sugerir bajar precios de productos con stock alto y sin ventas recientes.
- [ ] **Backend (RRHH):** IA para recomendaciones de horarios de empleados y tiempos basados en el flujo de trabajo.

## 🕒 Fichaje y Control Horario (Clock-in / Clock-out) (?)

- [ ] **Esquema BD:** Añadir `clockInTime` y `clockOutTime` a `DbShift` (o crear modelo `DbTimeLog` para registrar pausas).
- [ ] **Frontend:** Interfaz de fichaje en tiempo real (con opción de geolocalización, según README).
- [ ] **Backend:** Lógica para comparar hora real vs hora programada.

## 💰 Pedidos, Descuentos y Propinas

- [ ] **Esquema BD:** Añadir campos `tipAmount`, `discountAmount` (o porcentaje) a `DbOrder` y `DbOrderItem`.
- [ ] **Frontend:** Añadir opciones en el TPV para registrar propinas y aplicar descuentos (invitaciones de la casa, promociones).
- [ ] **Backend:** Actualizar la lógica de cálculo de los totales de la orden.

## Landing Page

...

## Printer

Hay que poner que el backend de la impresora coja la ip actual local del ordenador o que la web lo detecte ara que cualquiera que esté en la red pueda imprimir y mandar tickets.

Poner seguridad de cors para la direccion de la url o una pequeña ruta con la clave que cambie cada cierto tiempo y la genere de nuevo.
