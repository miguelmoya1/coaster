# Printing Bridge

El servicio de impresion vive en la aplicacion Go (apps/printer-service) y se integra con API/Web mediante configuracion por bar.

## Objetivo

- Separar el canal de impresion de la app principal.
- Mantener latencia baja y aislar errores de hardware.

## Recomendaciones

- Restringir origenes CORS al dominio de produccion.
- Rotar credenciales/tokens de dispositivo por bar.
- Añadir healthcheck y reintentos controlados en cola de impresion.
