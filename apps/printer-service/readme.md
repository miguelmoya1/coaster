# Printer Service (Servicio de Impresión)

Este servicio se encarga de gestionar la impresión de tickets de forma local, interactuando directamente con las impresoras configuradas (por USB o red) y ofreciendo una API local para ser consumida por el frontend (Angular u otros clientes).

## Requisitos Previos

- **Go** versión 1.26 o superior instalada.

## Instalación y Configuración

Para inicializar y descargar todas las dependencias del proyecto, ejecuta desde la raíz de este servicio:

```bash
go mod tidy
```

## Ejecución en Desarrollo

Para ejecutar el servicio localmente en modo desarrollo sin compilar:

```bash
go run cmd/server/main.go
```

## Compilación (Build)

Para compilar el proyecto en un binario ejecutable según la plataforma de destino (se usan los flags `-ldflags="-s -w"` para omitir símbolos y DWARF, reduciendo significativamente el tamaño del binario en producción):

### Para clientes Windows:

```bash
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o printer-service.exe cmd/server/main.go
```

### Para servidor o clientes Linux:

```bash
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o printer-service cmd/server/main.go
```

## Estructura del Proyecto

- `cmd/server/main.go`: Punto de entrada de la aplicación.
- `internal/`: Lógica interna de la aplicación:
  - `domain/`: Interfaces y entidades del dominio (ej. definición de impresora).
  - `infrastructure/`: Implementaciones de bajo nivel (ej. conexión USB/Red, drivers).
  - `usecase/`: Casos de uso de la aplicación (ej. imprimir un ticket).
  - `updater/`: Módulo de auto-actualización del servicio.
