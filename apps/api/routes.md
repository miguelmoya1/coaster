# 📍 API Routes Overview

Esta es la documentación actualizada de todas las rutas de la API, extraída directamente de los controladores existentes en el backend. Todas las llamadas a APIs relativas a bares (`/bars/:barId/...`) validan adicionalmente el `Role` del usuario en ese Bar específico (`OWNER` o `STAFF`). Todos los endpoints, excepto donde se especifique lo contrario, están protegidos por `FirebaseAuthGuard`.

## 🧑‍🤝‍🧑 Módulo: Users (`/users`)

Gestiona la cuenta global del profesional/administrador en la plataforma.

| Método  | Ruta        | DTO Entrada     | Guard/Role                  | Descripción                                         |
| ------- | ----------- | --------------- | --------------------------- | --------------------------------------------------- |
| `GET`   | `/users/me` | -               | `OptionalFirebaseAuthGuard` | Obtiene el perfil actual (`User`) usando el Token.  |
| `PATCH` | `/users/me` | `UpdateUserDto` | `FirebaseAuthGuard`         | Actualiza parcialmente los datos del perfil actual. |

## 🍺 Módulo: Bars (`/bars`)

Gestiona los bares a los que el trabajador tiene acceso, ya sea como Administrador (`OWNER`) o Empleado (`STAFF`).

| Método | Ruta           | DTO Entrada    | Guard/Role          | Descripción                                          |
| ------ | -------------- | -------------- | ------------------- | ---------------------------------------------------- |
| `GET`  | `/bars`        | -              | `FirebaseAuthGuard` | Devuelve los bares en los que el usuario es miembro. |
| `GET`  | `/bars/:barId` | -              | `FirebaseAuthGuard` | Devuelve los bares en los que el usuario es miembro. |
| `POST` | `/bars`        | `CreateBarDto` | `FirebaseAuthGuard` | Crea un nuevo negocio asumiendo el rol de `OWNER`.   |

## 👥 Módulo: Bar Members (`/bars/:barId/members`)

Gestiona la plantilla dentro de un local específico.

| Método | Ruta                   | DTO Entrada          | Roles Validados | Descripción                                        |
| ------ | ---------------------- | -------------------- | --------------- | -------------------------------------------------- |
| `GET`  | `/bars/:barId/members` | -                    | `OWNER, STAFF`  | Devuelve todos los miembros asigados a este Bar.   |
| `POST` | `/bars/:barId/members` | `InviteBarMemberDto` | `OWNER`         | Invita a una persona (crea el perfil y le asocia). |

## 📦 Módulo: Categories & Products (`/bars/:barId/...`)

"La Despensa": Control de Stock e ítems de la carta.

**Categories:**
| Método | Ruta | DTO Entrada | Roles Validados | Descripción |
| ------- | ----------------------------------- | ------------------- | ------------------- | ---------------------------------------------------------- |
| `GET` | `/bars/:barId/categories` | - | `OWNER, STAFF` | Obtiene todas las categorías junto a sus productos |
| `POST` | `/bars/:barId/categories` | `CreateCategoryDto` | `OWNER` | Crea una nueva agrupación de stock (p. ej: "Cervezas"). |

**Products:**
| Método | Ruta | DTO Entrada | Roles Validados| Descripción |
| ------- | -------------------------------------------- | -------------------------- | -------------- | --------------------------------------------- |
| `POST` | `/bars/:barId/products` | `CreateProductDto` | `OWNER` | Registra un nuevo producto (ítem) en un Bar. |
| `PATCH` | `/bars/:barId/products/:productId/status` | `UpdateProductStatusDto` | `OWNER, STAFF` | Botón visual: cambia el estado del stock. |

## 📅 Módulo: Shifts & Exchanges (`/bars/:barId/...`)

"El Cuadrante": Horarios y turnos de los empleados.

**Shifts:**
| Método | Ruta | DTO Entrada | Roles Validados | Descripción |
| -------- | --------------------------------------- | ------------------- | --------------- | ----------------------------------------------------------- |
| `GET` | `/bars/:barId/shifts?startDate=&endDate=`| - | `OWNER, STAFF` | Devuelve los turnos situados en ese rango de fechas. |
| `POST` | `/bars/:barId/shifts` | `CreateShiftDto` | `OWNER` | Registra la creación de un turno en el calendario. |

**Shift Exchanges:**
| Método | Ruta | DTO Entrada | Roles Validados| Descripción |
| -------- | ----------------------------------------------------- | ------------------------ | -------------- | --------------------------------------------- |
| `GET` | `/bars/:barId/exchanges` | - | `OWNER, STAFF` | Devuelve cambios propuestos pendientes. |
| `POST` | `/bars/:barId/shifts/:shiftId/exchanges` | `CreateShiftExchangeDto` | `OWNER, STAFF` | Alguien solicita un intercambio de su turno. |
| `PATCH` | `/bars/:barId/exchanges/:exchangeId/accept` | - | `OWNER, STAFF` | Proceso por el que alguien acepta la cesión. |
