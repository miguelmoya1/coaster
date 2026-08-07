# Roadmap de Coaster

## Hecho

### Infraestructura SaaS y comercializacion

- Landing comercial en raiz y aplicacion en `/bars`.
- Monetizacion con Stripe Checkout, Customer Portal y webhooks idempotentes.
- Publicacion de eventos internos de dominio desde los webhooks para desacoplar efectos.
- `SubscriptionActiveGuard`: el impago corta la escritura pero **no la lectura**, para que un bar
  conserve el acceso a su historico.

### Backoffice de administracion

- Panel en `/admin` con resumen de plataforma, bares, usuarios y auditoria.
- Concesion manual de PRO sin pasar por Stripe, con caducidad y motivo.
- Registro de auditoria de toda accion de admin.
- Modelo de permisos unificado en `@coaster/common`, con la jerarquia OWNER / MANAGER / STAFF
  cubierta por tests.

Ver [backoffice](admin/backoffice.md) y [modelo de acceso](architecture/permissions.md).

## Siguiente

### Operativa interna y cumplimiento legal

- Fichaje y control horario (clock-in y clock-out) con geolocalizacion asincrona.
- Contraste entre planificacion teorica y marcas reales.

### Capa de inteligencia

- Recomendaciones de ventas, inventario y RRHH sobre el historico acumulado.
- Procesamiento asincrono con jobs programados.

## Por plantear

- Sistema de reserva de mesas.
- Carta publica consultable por el cliente final.
