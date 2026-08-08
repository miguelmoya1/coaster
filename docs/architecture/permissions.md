# Modelo de acceso

Quien puede hacer que en Coaster se decide en **tres ejes independientes**. Una peticion tiene que
pasar los tres.

| Eje              | Pregunta                        | Valores                          | Donde vive                        |
| ---------------- | ------------------------------- | -------------------------------- | --------------------------------- |
| Rol de plataforma | Quien eres en Coaster           | `USER`, `ADMIN`                  | `User.role`                       |
| Rol en el bar     | Que eres dentro de **ese** bar  | `OWNER`, `MANAGER`, `STAFF`      | `BarMember.role`                  |
| Estado de acceso  | Ese bar tiene el servicio vivo  | Stripe, concesion manual, ninguno | `BarSubscription`                 |

Son ortogonales: un `ADMIN` de plataforma no es miembro de ningun bar, y un `OWNER` de un bar no
tiene ningun poder sobre la plataforma.

## La tabla de permisos

`packages/common/src/domain/permissions/bar-permissions.ts` es la **unica** fuente de verdad. La
API y el front la importan **directamente de `@coaster/common`**; no hay re-exportacion desde
ningun `core`, para que no exista una segunda ruta por la que llegar a ella.

Estuvo duplicada en ambos lados y llego a divergir: al web le faltaban `bar:view-printer` y
`bar:manage-printer`, de modo que la UI escondia acciones que la API si permitia. Por eso ahora
vive en `common`.

`hasPermission(role, permission)` es la funcion que decide. `OWNER` cortocircuita a `true`: no se
mantiene una lista suya, tiene todo por definicion.

`getRolePermissions(role)` **no decide nada**. Solo describe: rellena `BarMember.permissions` en el
payload y le dice al asistente de IA que puede hacer el usuario. La autorizacion real siempre es
`hasPermission`.

Jerarquia, verificada en `bar-permissions.spec.ts`: `STAFF ⊂ MANAGER ⊂ OWNER`.

- **STAFF**: opera la sala. Pedidos, cobros, mesas, stock, sus turnos e intercambios, fichar su
  propia jornada (`bar:clock-in`) y pedir correcciones sobre sus marcas
  (`bar:request-time-correction`, que no las aplica: las deja pendientes de validacion).
- **MANAGER**: lo de STAFF mas catalogo, invitar miembros, turnos de otros, la impresora y el
  registro horario del equipo (`bar:view-time-entries`, `bar:manage-time-entries`).
- **OWNER**: todo, incluida la facturacion, quitar miembros y **cambiar el rol de cualquiera**.

`bar:update-member-role` es exclusivo de OWNER: el MANAGER lleva el dia a dia pero no reparte
poder, igual que tampoco puede echar a nadie ni tocar la facturacion.

Cambiar un rol tiene **una sola ruta**: `PATCH /bars/:barId/members/:memberId`. El backoffice no
tiene la suya: `BarPermissionsGuard` ya deja pasar al `ADMIN` antes de mirar la pertenencia, asi que
un admin usa exactamente el mismo endpoint que un dueno.

La auditoria no se pierde por ello: `UpdateMemberRoleCommand` publica `MemberRoleChangedEvent` con
quien actua y su rol de plataforma, y el modulo `admin` escucha ese evento y **registra solo si el
actor era `ADMIN`**. Asi la regla de no dejar el bar sin OWNER vive en un unico sitio y la
auditoria cuelga de un hecho, no de una ruta paralela.

## Los cuatro guards

El orden importa. Nest ejecuta los guards **globales antes** que los de controlador.

### 1. `SubscriptionActiveGuard` (global, `APP_GUARD`)

Decide si el bar tiene el servicio vivo. Deja pasar en este orden:

1. `GET`, `HEAD` y `OPTIONS` **siempre**. Es deliberado: un bar que deja de pagar conserva el acceso
   de lectura a su historico, porque puede necesitarlo por obligacion legal. Solo pierde la escritura.
2. Rutas con `@SkipSubscriptionCheck()`.
3. Las rutas de gestion de la propia suscripcion, o no se podria pagar para recuperar el acceso.
4. Peticiones sin `barId`.
5. Concesion manual vigente (ver abajo). **Se comprueba antes que Stripe.**
6. Stripe: periodo pagado en curso, prueba en curso, o cancelacion que aun no ha llegado a su fecha.
7. Como ultimo recurso, si el usuario es `ADMIN` de plataforma.

Si nada aplica, responde **402** con `SUBSCRIPTION_EXPIRED` y el front abre el dialogo de planes.

Como este guard corre antes que `FirebaseAuthGuard`, en el paso 7 todavia no hay `request.user`:
resuelve la identidad leyendo el bearer token a mano. Solo lo hace si ya ha decidido rechazar, asi
que la peticion normal no paga ese coste.

### 2. `FirebaseAuthGuard` — identidad

Verifica el token con Firebase, busca el usuario local por `googleId` y **rechaza si
`user.active` es `false`**. Esa comprobacion es lo que hace real el boton de desactivar del
backoffice; sin ella el usuario seguia entrando con acceso completo. El mismo criterio se aplica
en websockets (`WsAuthService`).

### 3. `AdminGuard` — rol de plataforma

Exige `User.role === ADMIN`, pero **solo si la ruta lleva `@Admin()`**. Sin ese decorador el guard
devuelve `true` y no protege nada.

Es un fallo abierto por diseno (permite montar el guard globalmente sin bloquear todo), y sostiene
las 14 rutas del backoffice. `admin-controllers.security.spec.ts` recorre `AdminControllers` y
falla si algun controlador pierde el `@Admin()`, los guards o su orden.

### 4. `BarPermissionsGuard` — pertenencia y permiso

1. Si el usuario es `ADMIN` de plataforma, pasa **sin comprobar pertenencia**.
2. Si no, exige membresia activa en ese bar.
3. Si la ruta declara `@BarPermissions(...)`, exige todos esos permisos via `hasPermission`.

Una ruta con `barId` pero sin `@BarPermissions` solo pide pertenecer al bar.

## El admin de plataforma

Un `ADMIN` entra en cualquier bar con poderes de `OWNER` sin ser miembro. Se consigue en tres
puntos que hay que leer juntos:

| Punto                    | Que hace                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| `BarPermissionsGuard`    | Le deja pasar antes de mirar la membresia                             |
| `SubscriptionActiveGuard` | Le deja escribir aunque el bar no haya pagado                         |
| `GetMemberMeHandler`     | Le devuelve una membresia sintetica de `OWNER` si no es miembro real  |

El tercero es el que hace que la **UI** funcione: sin el, la API le permitiria todo pero el front
le escondería los botones, porque `MyMemberStore` no tendria rol del que derivar permisos.

## Concesion manual de plan

Un admin puede dar PRO a un bar sin pasar por Stripe. Vive en columnas propias de
`BarSubscription`, **separadas de las de Stripe**:

```text
manualPlan            plan concedido (solo PRO; FREE no concede acceso)
manualGrantExpiresAt  null = sin caducidad
manualGrantReason     nota interna del admin
manualGrantedById     que admin lo concedio
manualGrantedAt       cuando
```

Separarlas es lo que permite que un webhook posterior de Stripe actualice la facturacion **sin
pisar la concesion**, y que al retirarla el bar vuelva limpiamente a lo que diga Stripe.

`isManualGrantActive()` es la unica funcion que decide si una concesion sigue viva, y la usan el
guard, el mapper y el backoffice para que no puedan discrepar.

### Que se ve y quien lo ve

`GET /bars/:barId/bar-subscription` lo puede llamar cualquier miembro del bar. Por eso hay dos
formas del mismo dato:

- `toDomain()` — payload del workspace. Solo `plan` y `expiresAt`: lo justo para que la UI no se
  bloquee.
- `toAdminDomain()` — solo backoffice. Anade motivo, quien la concedio y cuando.

La nota interna del admin no debe llegar al bar. `bar-subscription.mapper.spec.ts` lo fija
serializando el payload publico y comprobando que no contiene ni el motivo ni el nombre del admin.

## Auditoria

Toda accion del backoffice queda en `AdminAuditLog`: quien, que, sobre que, cuando y con que motivo.
Es la contrapartida de que el admin pueda saltarse todas las barreras anteriores.
