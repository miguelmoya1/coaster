# 🧑‍🤝‍🧑 Módulo: Users (Ya empezado)

Gestiona los empleados y sus perfiles.

| Método  | Ruta         | DTO Entrada     | Retorno  | Descripción                                            |
| ------- | ------------ | --------------- | -------- | ------------------------------------------------------ |
| `GET`   | `/users`     | -               | `User[]` | Listar todos los empleados (Para el Admin/Calendario). |
| `GET`   | `/users/me`  | -               | `User`   | (Vital) Obtener mi propio perfil usando el Token.      |
| `POST`  | `/users`     | `CreateUserDto` | `User`   | Crear un nuevo empleado (Admin).                       |
| `PATCH` | `/users/:id` | `UpdateUserDto` | `User`   | Editar nombre, rol o desactivarlo (Soft Delete).       |

# 🔐 Módulo: Auth (Próximo paso crítico)

Gestiona el login y los tokens JWT.

| Método | Ruta            | DTO Entrada | Retorno        | Descripción                                |
| ------ | --------------- | ----------- | -------------- | ------------------------------------------ |
| `POST` | `/auth/login`   | `LoginDto`  | `AuthResponse` | Enviar Email + PIN y recibir Token + User. |
| `POST` | `/auth/refresh` | -           | `Token`        | (Opcional) Refrescar sesión sin pedir PIN. |

# 📅 Módulo: Shifts (El corazón de la App)

Gestiona el calendario y los turnos.

| Método   | Ruta                        | DTO Entrada         | Retorno         | Descripción                                   |
| -------- | --------------------------- | ------------------- | --------------- | --------------------------------------------- |
| `GET`    | `/shifts?from=Date&to=Date` | -                   | `Shift[]`       | Obtener turnos de un rango (ej: esta semana). |
| `POST`   | `/shifts`                   | `CreateShiftDto`    | `Shift`         | Crear un turno (Admin asigna a alguien).      |
| `DELETE` | `/shifts/:id`               | -                   | `boolean`       | Borrar un turno.                              |
| `POST`   | `/shifts/exchange`          | `CreateExchangeDto` | `ShiftExchange` | "Oye, te cambio el turno".                    |
| `PATCH`  | `/shifts/exchange/:id`      | `UpdateExchangeDto` | `ShiftExchange` | Aceptar o Rechazar el cambio.                 |

# 📦 Módulo: Products (Inventario Rápido)

Gestiona el estado del stock (Rojo/Amarillo/Verde).

| Método  | Ruta                   | DTO Entrada              | Retorno      | Descripción                               |
| ------- | ---------------------- | ------------------------ | ------------ | ----------------------------------------- |
| `GET`   | `/products`            | -                        | `Product[]`  | Listar carta con sus estados.             |
| `GET`   | `/products/categories` | -                        | `Category[]` | Listar categorías (Bebidas, Limpieza...). |
| `PATCH` | `/products/:id/status` | `UpdateProductStatusDto` | `Product`    | (El botón clave) Cambiar a "AGOTADO".     |

# ⚔️ Tu plan de ataque

1. Ya tienes el Controller y Service de Users medio montados (solo el create y findAll).
2. Arregla el comando (`npx nx serve api`) y comprueba que arranca.
3. Verifica que puedes crear un usuario (`POST /users`) con Postman/Curl.
4. Siguiente paso lógico: Crear el módulo Auth para poder hacer Login y proteger las rutas, o seguir con Shifts si prefieres ver datos en pantalla antes que seguridad.

¿Te ha arrancado bien la API? ¿Por cuál módulo quieres seguir?
