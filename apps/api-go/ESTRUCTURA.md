# Estructura del proyecto

Plantilla de estructura para un proyecto con backend en Go (arquitectura hexagonal),
frontend separado e infraestructura local con Docker. Sirve como referencia para
replicarla en cualquier proyecto.

```
project/
├── client/                          # Frontend
├── deployments/                     # Infraestructura (Docker Compose, Dockerfiles…)
│   └── compose.yml
├── server/                          # Backend en Go
│   ├── cmd/
│   │   └── api/
│   │       └── main.go              # Punto de entrada y cableado de dependencias
│   ├── internal/
│   │   ├── config/                  # Carga de configuración
│   │   ├── core/
│   │   │   ├── domain/              # Entidades y errores de negocio
│   │   │   └── ports/               # Interfaces (contratos)
│   │   ├── service/                 # Lógica de negocio
│   │   └── adapter/
│   │       ├── handler/
│   │       │   ├── http/            # Handlers, router, respuestas y SSE
│   │       │   └── middleware/      # Middlewares HTTP (auth, permisos, logging…)
│   │       ├── repository/          # Acceso a base de datos
│   │       │   └── queries/         # Un archivo .sql por consulta
│   │       ├── cache/               # Redis: caché, bus de eventos, rate limit
│   │       ├── payment/             # Pasarela de pagos (Stripe…)
│   │       ├── email/               # Envío de emails (Resend…)
│   │       ├── storage/             # Almacenamiento de archivos (GCS, S3…)
│   │       └── ai/                  # Proveedor de IA
│   ├── scripts/                     # Migraciones SQL y scripts auxiliares
│   ├── .env                         # Configuración local (fuera de git)
│   ├── go.mod
│   └── go.sum
└── .gitignore
```

Las carpetas de `adapter/` que no sean `handler/` ni `repository/` solo se crean si el
proyecto usa ese servicio externo.

---

## Raíz

| Carpeta | Para qué sirve |
|---|---|
| `client/` | La aplicación frontend. Es independiente del servidor y solo se comunica con él por HTTP. |
| `deployments/` | Todo lo que sirve para levantar el proyecto y sus dependencias: `compose.yml` (base de datos, caché, etc.), Dockerfiles y configuración de despliegue. |
| `server/` | El backend. Es un módulo Go autónomo. |

---

## `server/`

### `cmd/`

Los **puntos de entrada** del programa. Cada subcarpeta es un ejecutable distinto
(`cmd/api`, `cmd/worker`, `cmd/migrate`…).

El `main.go` no contiene lógica. Solo:

1. Carga la configuración.
2. Crea las conexiones externas (base de datos, Redis, clientes de terceros).
3. Construye las capas en orden: **adaptadores → servicios → handlers → router**.
4. Arranca el servidor y gestiona el apagado ordenado.

### `internal/`

El código privado de la aplicación. Go impide que otro módulo importe lo que hay aquí dentro.

#### `internal/config/`

Lee la configuración, ya sea del archivo `.env` o de las variables de entorno, y la expone
en un struct. Es el único sitio donde se leen variables de entorno.

#### `internal/core/`

El **núcleo** de la aplicación. No depende de HTTP, de la base de datos ni de ninguna
librería externa.

- **`domain/`**: las entidades del negocio (structs), los inputs para crearlas o
  modificarlas y los errores de negocio (`ErrNotFound`, `ErrInvalidPayload`…).
- **`ports/`**: las **interfaces** que conectan las capas.
  - `XxxRepository`: lo que el negocio necesita de la persistencia.
  - `XxxService`: lo que el negocio ofrece a los handlers.
  - Una interfaz por cada servicio externo (`PaymentGateway`, `Mailer`, `FileStorage`…).
  - `EventPublisher`: para avisar de que algo ha pasado (ver más abajo).

#### `internal/service/`

La **lógica de negocio** o casos de uso. Hay un servicio por entidad y cada método es un
caso de uso: no hace falta separar comandos y consultas en clases distintas (CQRS).

Los servicios implementan las interfaces `XxxService` y solo usan interfaces de `ports`, así
que nunca saben qué base de datos o qué proveedor hay detrás. Aquí se valida, se normaliza y
se aplican las reglas.

#### `internal/adapter/`

Las **implementaciones concretas** que conectan el núcleo con el mundo exterior.

- **`handler/http/`**: la capa de transporte.
  - `router.go` registra las rutas y aplica los middlewares.
  - `xxx_handler.go` hay uno por entidad. Lee la petición, llama al servicio y traduce los
    errores de dominio a códigos HTTP.
  - `response.go` contiene los helpers comunes para leer JSON y escribir respuestas con un
    formato uniforme.
  - Los streams en tiempo real (SSE) también son handlers HTTP.
- **`handler/middleware/`**: el código que envuelve cada petición, como logging,
  recuperación de panics, autenticación, permisos, CORS o rate limiting.
- **`repository/`**: la persistencia.
  - `client.go` crea el pool de conexiones.
  - `xxx_repository.go` hay uno por entidad. Implementa las interfaces `XxxRepository`.
  - `queries/` guarda el SQL, un archivo por consulta (ver más abajo).
- **`cache/`, `payment/`, `email/`, `storage/`, `ai/`**: un adaptador por servicio externo.
  Cada uno implementa su interfaz de `ports`, así que se puede cambiar de proveedor sin tocar
  los servicios.

### `scripts/`

Los archivos de apoyo, como las migraciones SQL o scripts de utilidad.

---

## Consultas SQL en archivos `.sql`

Las consultas se escriben a mano, **una por archivo**, dentro de `repository/queries/` y
agrupadas por entidad:

```
repository/
├── order_repository.go
└── queries/
    └── order/
        ├── find_by_id.sql
        ├── list_by_establishment.sql
        └── insert.sql
```

El repositorio las incrusta en el binario con `//go:embed`:

```go
//go:embed queries/order/find_by_id.sql
var findOrderByIDQuery string

func (r *OrderRepository) FindByID(ctx context.Context, id string) (*domain.Order, error) {
	row := r.pool.QueryRow(ctx, findOrderByIDQuery, id)
	// …
}
```

- **Por qué así**: el SQL queda separado del código Go, y el editor lo trata como SQL de
  verdad, con resaltado, formato y autocompletado si lo conectas a la base de datos.
- **Sin coste en ejecución**: `go:embed` mete el contenido en el binario al compilar, así
  que no se leen archivos al arrancar ni hay que desplegarlos aparte.
- **Seguro**: si el archivo no existe, **no compila**. Una variable por consulta es mejor
  que cargarlas por nombre desde un mapa, porque un error tipográfico se detecta al compilar.
- **Limitación**: `go:embed` solo ve archivos dentro de la carpeta del paquete o de sus
  subcarpetas. Por eso `queries/` está dentro de `repository/`.
- **Consultas simples**: se evita anidar relaciones en una sola consulta. Si hace falta un
  pedido con sus líneas, se hacen dos consultas sencillas (el pedido, y las líneas con
  `WHERE order_id = ANY($1)`) y se juntan en Go.

---

## Eventos

Cuando algo cambia (se crea un pedido, se borra un producto…) a veces hay que hacer más
cosas: avisar por tiempo real, escribir auditoría o invalidar la caché. Para no acoplar el
servicio a todo eso:

1. En `ports/` hay una interfaz `EventPublisher` con un método `Publish(event)`.
2. El servicio publica el evento **después** de guardar en la base de datos.
3. Cada suscriptor lo procesa en su propia goroutine, así que la respuesta no espera.

---

## Regla de dependencias

```
adapter  ──►  service  ──►  core (domain + ports)
```

- `core` no importa nada del proyecto.
- `service` solo importa `core`.
- `adapter` importa `core` y, como mucho, `service`.
- `cmd` lo importa todo para conectarlo.

Las dependencias siempre apuntan **hacia dentro**. Gracias a eso se puede cambiar la base
de datos, el proveedor o el framework HTTP sin tocar la lógica de negocio, y testear los
servicios con implementaciones falsas.

## Flujo de una petición

```
HTTP → middleware → handler → service → repository → base de datos
                                  └──► otros adaptadores (pagos, email, caché…)
```

---

## Cómo añadir una entidad nueva

| Paso | Archivo |
|---|---|
| 1. Entidad, inputs y errores | `internal/core/domain/xxx.go` |
| 2. Interfaces de repositorio y servicio | `internal/core/ports/xxx.go` |
| 3. Lógica de negocio | `internal/service/xxx_service.go` |
| 4. Consultas SQL | `internal/adapter/repository/queries/xxx/*.sql` |
| 5. Persistencia | `internal/adapter/repository/xxx_repository.go` + migración en `scripts/` |
| 6. Endpoints HTTP | `internal/adapter/handler/http/xxx_handler.go` + registro en `router.go` |
| 7. Conexión de todo | `cmd/api/main.go` |
